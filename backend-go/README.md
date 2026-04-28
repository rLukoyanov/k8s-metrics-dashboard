# Load Test Orchestrator (Go + go-clean-template)

## Описание

Небольшое приложение на Go, построенное по принципам `go-clean-template`.

### Задача приложения

1. Получить REST-запрос от пользователя.
2. Принять входную и выходную нагрузку (payloads).
3. Сформировать тестовый план.
4. Отправить тестовый план во внешнюю систему нагрузочного тестирования.
5. Отслеживать статус выполнения теста.
6. Отдавать статус пользователю через REST API.

## Архитектура и структура

- Clean Architecture (entities, usecases, repo, external, controller, scheduler, config)
- In-memory repository (MVP)
- REST API (создание теста, получение статуса)
- Клиент внешней load-testing системы
- Polling статусов

## Запуск

```bash
go run ./cmd/app
```

## Пример .env

```
HTTP_PORT=8080
LOAD_SYSTEM_URL=http://localhost:9000
STATUS_POLL_INTERVAL=30s
```

## Roadmap

- [x] REST API
- [x] In-memory repository
- [x] Mock external system
- [x] Status polling
- [ ] PostgreSQL
- [ ] Retries
- [ ] Graceful shutdown
- [ ] Docker-compose
- [ ] Metrics
- [ ] Auth
- [ ] Webhook callbacks
- [ ] Distributed tracing

## Рекомендуемые библиотеки

- gin-gonic/gin
- jackc/pgx
- google/uuid
- samber/lo
- uber-go/zap
- prometheus/client_golang
