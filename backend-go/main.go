package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gorilla/mux"
)

var prometheusURL string

type PrometheusResponse struct {
	Status string                 `json:"status"`
	Data   PrometheusResponseData `json:"data"`
	Error  string                 `json:"error,omitempty"`
}

type PrometheusResponseData struct {
	ResultType string           `json:"resultType"`
	Result     []PrometheusItem `json:"result"`
}

type PrometheusItem struct {
	Metric map[string]string `json:"metric"`
	Value  []interface{}     `json:"value,omitempty"`
	Values [][]interface{}   `json:"values,omitempty"`
}

type MetricValue struct {
	Timestamp int64   `json:"timestamp"`
	Value     float64 `json:"value"`
}

type MetricDataset struct {
	Container string        `json:"container"`
	Pod       string        `json:"pod"`
	Values    []MetricValue `json:"values"`
}

type MetricsResponse struct {
	Query    string          `json:"query,omitempty"`
	Datasets []MetricDataset `json:"datasets"`
}

type QueryRequest struct {
	Query string `json:"query"`
	Type  string `json:"type"`
}

func init() {
	prometheusURL = os.Getenv("PROMETHEUS_URL")
	if prometheusURL == "" {
		prometheusURL = "http://localhost:9090"
	}
}

func enableCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func queryPrometheus(query string) (*PrometheusResponse, error) {
	url := fmt.Sprintf("%s/api/v1/query?query=%s", prometheusURL, query)
	resp, err := http.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result PrometheusResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	return &result, nil
}

func queryPrometheusRange(query string, start, end, step int64) (*PrometheusResponse, error) {
	url := fmt.Sprintf("%s/api/v1/query_range?query=%s&start=%d&end=%d&step=%d",
		prometheusURL, query, start, end, step)
	resp, err := http.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result PrometheusResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	return &result, nil
}

func getNamespaces(w http.ResponseWriter, r *http.Request) {
	query := "group by (namespace) (container_cpu_usage_seconds_total)"
	result, err := queryPrometheus(query)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if result.Status != "success" {
		http.Error(w, "Failed to fetch namespaces", http.StatusInternalServerError)
		return
	}

	namespaceMap := make(map[string]bool)
	for _, item := range result.Data.Result {
		if ns, ok := item.Metric["namespace"]; ok {
			namespaceMap[ns] = true
		}
	}

	namespaces := make([]string, 0, len(namespaceMap))
	for ns := range namespaceMap {
		namespaces = append(namespaces, ns)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"namespaces": namespaces,
	})
}

func getDeployments(w http.ResponseWriter, r *http.Request) {
	namespace := r.URL.Query().Get("namespace")
	if namespace == "" {
		http.Error(w, "Namespace parameter is required", http.StatusBadRequest)
		return
	}

	query := fmt.Sprintf(`group by (deployment) (container_cpu_usage_seconds_total{namespace="%s"})`, namespace)
	result, err := queryPrometheus(query)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if result.Status != "success" {
		http.Error(w, "Failed to fetch deployments", http.StatusInternalServerError)
		return
	}

	deploymentMap := make(map[string]bool)
	for _, item := range result.Data.Result {
		if dep, ok := item.Metric["deployment"]; ok && dep != "" {
			deploymentMap[dep] = true
		}
	}

	deployments := make([]string, 0, len(deploymentMap))
	for dep := range deploymentMap {
		deployments = append(deployments, dep)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"deployments": deployments,
	})
}

func getContainers(w http.ResponseWriter, r *http.Request) {
	namespace := r.URL.Query().Get("namespace")
	deployment := r.URL.Query().Get("deployment")

	if namespace == "" || deployment == "" {
		http.Error(w, "Namespace and deployment parameters are required", http.StatusBadRequest)
		return
	}

	query := fmt.Sprintf(`group by (container) (container_cpu_usage_seconds_total{namespace="%s",deployment="%s"})`, namespace, deployment)
	result, err := queryPrometheus(query)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if result.Status != "success" {
		http.Error(w, "Failed to fetch containers", http.StatusInternalServerError)
		return
	}

	containerMap := make(map[string]bool)
	for _, item := range result.Data.Result {
		if cont, ok := item.Metric["container"]; ok && cont != "" {
			containerMap[cont] = true
		}
	}

	containers := make([]string, 0, len(containerMap))
	for cont := range containerMap {
		containers = append(containers, cont)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"containers": containers,
	})
}

func getMetrics(w http.ResponseWriter, r *http.Request) {
	namespace := r.URL.Query().Get("namespace")
	deployment := r.URL.Query().Get("deployment")
	metric := r.URL.Query().Get("metric")
	containers := r.URL.Query().Get("containers")
	duration := r.URL.Query().Get("duration")

	if duration == "" {
		duration = "5m"
	}

	if namespace == "" || deployment == "" || metric == "" {
		http.Error(w, "Namespace, deployment, and metric parameters are required", http.StatusBadRequest)
		return
	}

	containerList := strings.Split(containers, ",")
	containerFilter := "container!=\"\""
	if len(containerList) > 0 && containers != "" {
		containerFilter = fmt.Sprintf(`container=~"%s"`, strings.Join(containerList, "|"))
	}

	var promqlQuery string
	switch metric {
	case "cpu":
		promqlQuery = fmt.Sprintf(`sum(rate(container_cpu_usage_seconds_total{namespace="%s",deployment="%s",%s}[%s])) by (container, pod)`,
			namespace, deployment, containerFilter, duration)
	case "memory":
		promqlQuery = fmt.Sprintf(`container_memory_working_set_bytes{namespace="%s",deployment="%s",%s}`,
			namespace, deployment, containerFilter)
	case "network_rx":
		promqlQuery = fmt.Sprintf(`sum(rate(container_network_receive_bytes_total{namespace="%s",deployment="%s",%s}[%s])) by (container, pod)`,
			namespace, deployment, containerFilter, duration)
	case "network_tx":
		promqlQuery = fmt.Sprintf(`sum(rate(container_network_transmit_bytes_total{namespace="%s",deployment="%s",%s}[%s])) by (container, pod)`,
			namespace, deployment, containerFilter, duration)
	case "disk_read":
		promqlQuery = fmt.Sprintf(`sum(rate(container_fs_reads_bytes_total{namespace="%s",deployment="%s",%s}[%s])) by (container, pod)`,
			namespace, deployment, containerFilter, duration)
	case "disk_write":
		promqlQuery = fmt.Sprintf(`sum(rate(container_fs_writes_bytes_total{namespace="%s",deployment="%s",%s}[%s])) by (container, pod)`,
			namespace, deployment, containerFilter, duration)
	default:
		http.Error(w, "Invalid metric type", http.StatusBadRequest)
		return
	}

	end := time.Now().Unix()
	start := end - 300
	step := int64(15)

	result, err := queryPrometheusRange(promqlQuery, start, end, step)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if result.Status != "success" {
		http.Error(w, "Failed to fetch metrics data", http.StatusInternalServerError)
		return
	}

	datasets := make([]MetricDataset, 0)
	for _, series := range result.Data.Result {
		container := series.Metric["container"]
		pod := series.Metric["pod"]
		if pod == "" {
			pod = "unknown"
		}

		values := make([]MetricValue, 0)
		for _, val := range series.Values {
			if len(val) >= 2 {
				timestamp := int64(val[0].(float64)) * 1000
				valueStr := val[1].(string)
				value, _ := strconv.ParseFloat(valueStr, 64)
				values = append(values, MetricValue{
					Timestamp: timestamp,
					Value:     value,
				})
			}
		}

		datasets = append(datasets, MetricDataset{
			Container: container,
			Pod:       pod,
			Values:    values,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(MetricsResponse{
		Query:    promqlQuery,
		Datasets: datasets,
	})
}

func customQuery(w http.ResponseWriter, r *http.Request) {
	var req QueryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if req.Query == "" {
		http.Error(w, "Query parameter is required", http.StatusBadRequest)
		return
	}

	var result *PrometheusResponse
	var err error

	if req.Type == "range" {
		end := time.Now().Unix()
		start := end - 300
		step := int64(15)
		result, err = queryPrometheusRange(req.Query, start, end, step)
	} else {
		result, err = queryPrometheus(req.Query)
	}

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

func healthCheck(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":     "healthy",
		"prometheus": prometheusURL,
	})
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "3001"
	}

	r := mux.NewRouter()
	r.HandleFunc("/api/namespaces", getNamespaces).Methods("GET")
	r.HandleFunc("/api/deployments", getDeployments).Methods("GET")
	r.HandleFunc("/api/containers", getContainers).Methods("GET")
	r.HandleFunc("/api/metrics", getMetrics).Methods("GET")
	r.HandleFunc("/api/query", customQuery).Methods("POST")
	r.HandleFunc("/health", healthCheck).Methods("GET")

	handler := enableCORS(r)

	log.Printf("🚀 Backend API server running on port %s\n", port)
	log.Printf("📊 Prometheus URL: %s\n", prometheusURL)
	log.Println("\nAvailable endpoints:")
	log.Println("  GET  /api/namespaces")
	log.Println("  GET  /api/deployments?namespace=<name>")
	log.Println("  GET  /api/containers?namespace=<name>&deployment=<name>")
	log.Println("  GET  /api/metrics?namespace=<name>&deployment=<name>&metric=<type>&containers=<list>")
	log.Println("  POST /api/query")
	log.Println("  GET  /health")

	if err := http.ListenAndServe(":"+port, handler); err != nil {
		log.Fatal(err)
	}
}
