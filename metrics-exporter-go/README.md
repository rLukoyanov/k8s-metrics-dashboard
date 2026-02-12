# Kubernetes Metrics Exporter (Go)

Mock exporter для генерации тестовых метрик Kubernetes в формате Prometheus.

## Метрики

Генерирует метрики для:
- 5 namespaces: default, kube-system, production, staging, development
- 6 deployments: nginx, api-server, frontend, backend, redis, postgresql
- Различные контейнеры для каждого deployment

### Типы метрик

- `container_cpu_usage_seconds_total` - Использование CPU
- `container_cpu_cfs_throttled_seconds_total` - CPU throttling
- `container_memory_working_set_bytes` - Использование памяти
- `container_memory_cache` - Memory cache
- `container_network_receive_bytes_total` - Входящий сетевой трафик
- `container_network_transmit_bytes_total` - Исходящий сетевой трафик
- `container_fs_reads_bytes_total` - Чтение с диска
- `container_fs_writes_bytes_total` - Запись на диск

## Эндпоинты

- `GET /metrics` - Метрики в формате Prometheus
- `GET /health` - Health check

## Локальная разработка

```bash
# Запустить exporter
go run main.go

# Проверить метрики
curl http://localhost:8080/metrics
```

## Docker

```bash
# Собрать образ
docker build -t metrics-exporter-go .

# Запустить
docker run -p 8080:8080 metrics-exporter-go
```

## Переменные окружения

- `PORT` - Порт сервера (по умолчанию: 8080)
