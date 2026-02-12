package main

import (
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"os"
	"time"
)

var (
	namespaces = []string{"default", "kube-system", "production", "staging", "development"}
	deployments = []string{"nginx", "api-server", "frontend", "backend", "redis", "postgresql"}
	containers = map[string][]string{
		"nginx":      {"nginx-main", "nginx-sidecar", "nginx-exporter"},
		"api-server": {"api", "auth", "cache", "logger"},
		"frontend":   {"react-app", "nginx-static", "node-exporter"},
		"backend":    {"spring-boot", "postgres-exporter", "redis-client"},
		"redis":      {"redis-server", "redis-sentinel", "redis-exporter"},
		"postgresql": {"postgres", "pgbouncer", "backup-agent"},
	}
)

func init() {
	rand.Seed(time.Now().UnixNano())
}

func randomValue(min, max float64) float64 {
	return min + rand.Float64()*(max-min)
}

func randomString(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyz0123456789"
	b := make([]byte, length)
	for i := range b {
		b[i] = charset[rand.Intn(len(charset))]
	}
	return string(b)
}

func generateMetrics() string {
	var metrics string

	for _, namespace := range namespaces {
		for _, deployment := range deployments {
			containerList := containers[deployment]
			if containerList == nil {
				containerList = []string{"main-container"}
			}

			for _, container := range containerList {
				podName := fmt.Sprintf("%s-%s", deployment, randomString(7))

				// CPU metrics
				cpuUsage := randomValue(0.1, 2.5)
				metrics += fmt.Sprintf("container_cpu_usage_seconds_total{namespace=\"%s\",pod=\"%s\",container=\"%s\",deployment=\"%s\"} %.4f\n",
					namespace, podName, container, deployment, cpuUsage)

				cpuThrottled := randomValue(0, 0.5)
				metrics += fmt.Sprintf("container_cpu_cfs_throttled_seconds_total{namespace=\"%s\",pod=\"%s\",container=\"%s\",deployment=\"%s\"} %.4f\n",
					namespace, podName, container, deployment, cpuThrottled)

				// Memory metrics
				memoryUsage := randomValue(100000000, 500000000) // 100MB - 500MB
				metrics += fmt.Sprintf("container_memory_working_set_bytes{namespace=\"%s\",pod=\"%s\",container=\"%s\",deployment=\"%s\"} %.0f\n",
					namespace, podName, container, deployment, memoryUsage)

				memoryCache := randomValue(10000000, 50000000) // 10MB - 50MB
				metrics += fmt.Sprintf("container_memory_cache{namespace=\"%s\",pod=\"%s\",container=\"%s\",deployment=\"%s\"} %.0f\n",
					namespace, podName, container, deployment, memoryCache)

				// Network metrics
				networkRx := randomValue(1000, 10000)
				metrics += fmt.Sprintf("container_network_receive_bytes_total{namespace=\"%s\",pod=\"%s\",container=\"%s\",deployment=\"%s\"} %.0f\n",
					namespace, podName, container, deployment, networkRx)

				networkTx := randomValue(500, 8000)
				metrics += fmt.Sprintf("container_network_transmit_bytes_total{namespace=\"%s\",pod=\"%s\",container=\"%s\",deployment=\"%s\"} %.0f\n",
					namespace, podName, container, deployment, networkTx)

				// Disk metrics
				diskRead := randomValue(100, 5000)
				metrics += fmt.Sprintf("container_fs_reads_bytes_total{namespace=\"%s\",pod=\"%s\",container=\"%s\",deployment=\"%s\"} %.0f\n",
					namespace, podName, container, deployment, diskRead)

				diskWrite := randomValue(50, 3000)
				metrics += fmt.Sprintf("container_fs_writes_bytes_total{namespace=\"%s\",pod=\"%s\",container=\"%s\",deployment=\"%s\"} %.0f\n",
					namespace, podName, container, deployment, diskWrite)
			}
		}
	}

	return metrics
}

func metricsHandler(w http.ResponseWriter, r *http.Request) {
	metrics := generateMetrics()
	w.Header().Set("Content-Type", "text/plain")
	w.WriteHeader(http.StatusOK)
	fmt.Fprint(w, metrics)
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	fmt.Fprintf(w, `{"status":"healthy"}`)
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	http.HandleFunc("/metrics", metricsHandler)
	http.HandleFunc("/health", healthHandler)

	log.Printf("🎯 K8s Metrics Mock Exporter running on port %s\n", port)
	log.Printf("📊 Metrics available at http://localhost:%s/metrics\n", port)

	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatal(err)
	}
}
