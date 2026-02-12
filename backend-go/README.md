# Backend API Server (Go)

REST API сервер на Go для интеграции с Prometheus.

## Эндпоинты

- `GET /api/namespaces` - Получить список namespaces
- `GET /api/deployments?namespace=<name>` - Получить deployments для namespace
- `GET /api/containers?namespace=<name>&deployment=<name>` - Получить контейнеры
- `GET /api/metrics?namespace=<name>&deployment=<name>&metric=<type>&containers=<list>` - Получить метрики
- `POST /api/query` - Выполнить кастомный PromQL запрос
- `GET /health` - Health check

## Локальная разработка

```bash
# Установить зависимости
go mod download

# Запустить сервер
PROMETHEUS_URL=http://localhost:9090 go run main.go
```

## Docker

```bash
# Собрать образ
docker build -t backend-go .

# Запустить
docker run -p 3001:3001 -e PROMETHEUS_URL=http://prometheus:9090 backend-go
```

## Переменные окружения

- `PORT` - Порт сервера (по умолчанию: 3001)
- `PROMETHEUS_URL` - URL Prometheus сервера (по умолчанию: http://localhost:9090)
