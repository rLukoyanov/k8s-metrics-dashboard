package main

import (
	"log"
	"math/rand"
	"net/http"
	"os"
	"time"

	"gopkg.in/yaml.v3"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

type Config struct {
	Server struct {
		Port int `yaml:"port"`
	} `yaml:"server"`

	Metrics []MetricConfig `yaml:"metrics"`
}

type MetricConfig struct {
	Name       string            `yaml:"name"`
	Type       string            `yaml:"type"`
	Help       string            `yaml:"help"`
	Labels     map[string]string `yaml:"labels"`
	Mode       string            `yaml:"mode"` // random | increment
	Min        float64           `yaml:"min"`
	Max        float64           `yaml:"max"`
	Step       float64           `yaml:"step"`
	IntervalMS int               `yaml:"interval_ms"`
}

func loadConfig(path string) (*Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	var cfg Config
	err = yaml.Unmarshal(data, &cfg)
	return &cfg, err
}

func main() {
	cfg, err := loadConfig("config.yaml")
	if err != nil {
		log.Fatal(err)
	}

	for _, m := range cfg.Metrics {
		go runMetric(m)
	}

	http.Handle("/metrics", promhttp.Handler())

	addr := ":" + fmt.Sprint(cfg.Server.Port)
	log.Println("Starting server on", addr)
	log.Fatal(http.ListenAndServe(addr, nil))
}

func runMetric(cfg MetricConfig) {
	labels := make([]string, 0, len(cfg.Labels))
	for k := range cfg.Labels {
		labels = append(labels, k)
	}

	var metricVec interface{}

	switch cfg.Type {
	case "gauge":
		metricVec = prometheus.NewGaugeVec(
			prometheus.GaugeOpts{
				Name: cfg.Name,
				Help: cfg.Help,
			},
			labels,
		)
	case "counter":
		metricVec = prometheus.NewCounterVec(
			prometheus.CounterOpts{
				Name: cfg.Name,
				Help: cfg.Help,
			},
			labels,
		)
	default:
		log.Println("Unknown metric type:", cfg.Type)
		return
	}

	prometheus.MustRegister(metricVec.(prometheus.Collector))

	labelValues := make([]string, 0, len(cfg.Labels))
	for _, v := range cfg.Labels {
		labelValues = append(labelValues, v)
	}

	ticker := time.NewTicker(time.Duration(cfg.IntervalMS) * time.Millisecond)
	defer ticker.Stop()

	var current float64

	for range ticker.C {
		switch cfg.Mode {
		case "random":
			current = cfg.Min + rand.Float64()*(cfg.Max-cfg.Min)
		case "increment":
			current += cfg.Step
		}

		switch m := metricVec.(type) {
		case *prometheus.GaugeVec:
			m.WithLabelValues(labelValues...).Set(current)
		case *prometheus.CounterVec:
			m.WithLabelValues(labelValues...).Add(cfg.Step)
		}
	}
}
