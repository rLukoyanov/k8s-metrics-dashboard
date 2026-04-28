package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"gopkg.in/yaml.v3"
)

// ─── Config types ────────────────────────────────────────────────────────────

type Config struct {
	Server struct {
		Port int `yaml:"port" json:"port"`
	} `yaml:"server" json:"server"`
	Metrics []MetricConfig `yaml:"metrics" json:"metrics"`
}

type MetricConfig struct {
	Name       string            `yaml:"name"        json:"name"`
	Type       string            `yaml:"type"        json:"type"`
	Help       string            `yaml:"help"        json:"help"`
	Labels     map[string]string `yaml:"labels"      json:"labels"`
	Mode       string            `yaml:"mode"        json:"mode"`
	Min        float64           `yaml:"min"         json:"min"`
	Max        float64           `yaml:"max"         json:"max"`
	Step       float64           `yaml:"step"        json:"step"`
	IntervalMS int               `yaml:"interval_ms" json:"interval_ms"`
}

// ─── Live state ───────────────────────────────────────────────────────────────

type MetricState struct {
	mu      sync.RWMutex
	current float64
	history []float64
	stop    chan struct{}
}

var (
	cfg      *Config
	cfgMu    sync.RWMutex
	states   = map[string]*MetricState{}
	statesMu sync.RWMutex
	registry = prometheus.NewRegistry()
)

// ─── Config helpers ───────────────────────────────────────────────────────────

func loadConfig(path string) (*Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var c Config
	return &c, yaml.Unmarshal(data, &c)
}

func saveConfig(path string, c *Config) error {
	data, err := yaml.Marshal(c)
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0644)
}

// ─── Metric runner ────────────────────────────────────────────────────────────

func startMetric(mc MetricConfig) {
	labels := make([]string, 0, len(mc.Labels))
	for k := range mc.Labels {
		labels = append(labels, k)
	}
	labelValues := make([]string, 0, len(mc.Labels))
	for _, v := range mc.Labels {
		labelValues = append(labelValues, v)
	}

	state := &MetricState{stop: make(chan struct{})}
	statesMu.Lock()
	states[mc.Name] = state
	statesMu.Unlock()

	var vec interface{}
	switch mc.Type {
	case "gauge":
		g := prometheus.NewGaugeVec(prometheus.GaugeOpts{Name: mc.Name, Help: mc.Help}, labels)
		registry.MustRegister(g)
		vec = g
	case "counter":
		c := prometheus.NewCounterVec(prometheus.CounterOpts{Name: mc.Name, Help: mc.Help}, labels)
		registry.MustRegister(c)
		vec = c
	default:
		log.Println("Unknown metric type:", mc.Type)
		return
	}

	go func() {
		ticker := time.NewTicker(time.Duration(mc.IntervalMS) * time.Millisecond)
		defer ticker.Stop()
		var current float64 = mc.Min

		for {
			select {
			case <-state.stop:
				return
			case <-ticker.C:
				if mc.Mode == "random" {
					current = mc.Min + rand.Float64()*(mc.Max-mc.Min)
				} else {
					current += mc.Step
				}

				switch m := vec.(type) {
				case *prometheus.GaugeVec:
					m.WithLabelValues(labelValues...).Set(current)
				case *prometheus.CounterVec:
					m.WithLabelValues(labelValues...).Add(mc.Step)
				}

				state.mu.Lock()
				state.current = current
				state.history = append(state.history, current)
				if len(state.history) > 60 {
					state.history = state.history[1:]
				}
				state.mu.Unlock()
			}
		}
	}()
}

func stopMetric(name string) {
	statesMu.Lock()
	defer statesMu.Unlock()
	if s, ok := states[name]; ok {
		close(s.stop)
		delete(states, name)
	}
}

func stopAll() {
	statesMu.Lock()
	defer statesMu.Unlock()
	for name, s := range states {
		close(s.stop)
		delete(states, name)
	}
}

// ─── API handlers ─────────────────────────────────────────────────────────────

func withCORS(h http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		h(w, r)
	}
}

// GET /api/config — возвращает текущий конфиг
func handleGetConfig(w http.ResponseWriter, r *http.Request) {
	cfgMu.RLock()
	defer cfgMu.RUnlock()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(cfg)
}

// PUT /api/config — применяет новый конфиг и перезапускает метрики
func handlePutConfig(w http.ResponseWriter, r *http.Request) {
	var newCfg Config
	if err := json.NewDecoder(r.Body).Decode(&newCfg); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Пересоздаём registry, чтобы избежать дублирования регистраций
	stopAll()
	registry = prometheus.NewRegistry()

	cfgMu.Lock()
	cfg = &newCfg
	cfgMu.Unlock()

	for _, m := range newCfg.Metrics {
		startMetric(m)
	}

	if err := saveConfig("config.yaml", &newCfg); err != nil {
		log.Println("Warning: could not save config.yaml:", err)
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

// GET /api/live — текущие значения и история всех метрик
func handleLive(w http.ResponseWriter, r *http.Request) {
	type metricSnap struct {
		Name    string    `json:"name"`
		Current float64   `json:"current"`
		History []float64 `json:"history"`
	}

	cfgMu.RLock()
	names := make([]string, 0, len(cfg.Metrics))
	for _, m := range cfg.Metrics {
		names = append(names, m.Name)
	}
	cfgMu.RUnlock()

	result := make([]metricSnap, 0, len(names))
	statesMu.RLock()
	for _, name := range names {
		if s, ok := states[name]; ok {
			s.mu.RLock()
			result = append(result, metricSnap{
				Name:    name,
				Current: s.current,
				History: append([]float64{}, s.history...),
			})
			s.mu.RUnlock()
		}
	}
	statesMu.RUnlock()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

func main() {
	var err error
	cfg, err = loadConfig("config.yaml")
	if err != nil {
		log.Fatal("Cannot load config.yaml:", err)
	}

	for _, m := range cfg.Metrics {
		startMetric(m)
	}

	// Prometheus /metrics через наш кастомный registry
	http.Handle("/metrics", promhttp.HandlerFor(registry, promhttp.HandlerOpts{}))

	// REST API
	http.HandleFunc("/api/config", withCORS(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			handleGetConfig(w, r)
		case http.MethodPut:
			handlePutConfig(w, r)
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	}))
	http.HandleFunc("/api/live", withCORS(handleLive))

	addr := fmt.Sprintf(":%d", cfg.Server.Port)
	log.Printf("Server started on %s", addr)
	log.Printf("  Prometheus: http://localhost%s/metrics", addr)
	log.Printf("  Config API: http://localhost%s/api/config", addr)
	log.Printf("  Live data:  http://localhost%s/api/live", addr)
	log.Fatal(http.ListenAndServe(addr, nil))
}
