# Проект мониторинга Kubernetes метрик с Prometheus

Этот проект предоставляет веб-интерфейс для мониторинга метрик контейнеров Kubernetes через Prometheus.

## Архитектура

- **Frontend**: React + TypeScript + Vite + Chart.js
- **Backend**: Node.js + Express (API для запросов к Prometheus)
- **Prometheus**: Сбор и хранение метрик
- **Metrics Exporter**: Генератор тестовых метрик K8s

## Быстрый старт

### 1. Запуск инфраструктуры (Prometheus + Backend + Mock Metrics)

```bash
# Запустить все сервисы через Docker Compose
docker-compose up -d

# Проверить статус сервисов
docker-compose ps

# Логи сервисов
docker-compose logs -f
```

Сервисы будут доступны по адресам:
- **Prometheus UI**: http://localhost:9090
- **Backend API**: http://localhost:3001
- **Metrics Exporter**: http://localhost:8080/metrics

### 2. Запуск Frontend

```bash
# Установить зависимости (если еще не установлены)
npm install

# Запустить dev сервер
npm run dev
```

Frontend будет доступен по адресу: http://localhost:5173

## API Endpoints

Backend API предоставляет следующие эндпоинты:

- `GET /api/namespaces` - Получить список namespaces
- `GET /api/deployments?namespace=<name>` - Получить deployments для namespace
- `GET /api/containers?namespace=<name>&deployment=<name>` - Получить контейнеры
- `GET /api/metrics?namespace=<name>&deployment=<name>&metric=<type>&containers=<list>` - Получить метрики
- `POST /api/query` - Выполнить произвольный PromQL запрос
- `GET /health` - Проверка здоровья сервиса

### Пример запроса метрик:

```bash
curl "http://localhost:3001/api/metrics?namespace=default&deployment=nginx&metric=cpu&containers=nginx-main,nginx-sidecar"
```

## Доступные метрики

- **CPU Usage** - Использование CPU по контейнерам
- **Memory Usage** - Использование памяти
- **Network Receive** - Входящий сетевой трафик
- **Network Transmit** - Исходящий сетевой трафик
- **Disk Read** - Чтение с диска
- **Disk Write** - Запись на диск

## Тестовые данные

Metrics Exporter генерирует тестовые метрики для следующих namespaces и deployments:

**Namespaces:**
- default
- kube-system
- production
- staging
- development

**Deployments:**
- nginx (контейнеры: nginx-main, nginx-sidecar, nginx-exporter)
- api-server (контейнеры: api, auth, cache, logger)
- frontend (контейнеры: react-app, nginx-static, node-exporter)
- backend (контейнеры: spring-boot, postgres-exporter, redis-client)
- redis (контейнеры: redis-server, redis-sentinel, redis-exporter)
- postgresql (контейнеры: postgres, pgbouncer, backup-agent)

## Использование

1. Откройте веб-интерфейс: http://localhost:5173
2. Выберите **Namespace** из выпадающего списка
3. Выберите **Deployment**
4. Выберите **Метрику** для отображения
5. Используйте фильтр контейнеров для отображения/скрытия конкретных контейнеров
6. Графики обновляются автоматически каждые 15 секунд

## Prometheus Queries

В интерфейсе отображаются PromQL запросы для каждого контейнера. Вы можете скопировать их и использовать напрямую в Prometheus UI (http://localhost:9090).

Пример PromQL запроса:
```promql
sum(rate(container_cpu_usage_seconds_total{namespace="default",deployment="nginx",container="nginx-main"}[5m])) by (container)
```

## Остановка сервисов

```bash
# Остановить все Docker контейнеры
docker-compose down

# Остановить и удалить volumes (все данные Prometheus будут удалены)
docker-compose down -v
```

## Разработка

### Frontend

```bash
# Запуск dev сервера с hot reload
npm run dev

# Сборка для production
npm run build

# Предпросмотр production сборки
npm run preview

# Линтинг
npm run lint
```

### Backend

Backend запускается автоматически через Docker Compose. Для разработки локально:

```bash
cd backend
npm install
npm start
```

### Добавление новых метрик

1. Обновите `metrics-exporter/index.js` для генерации новых метрик
2. Добавьте новый тип метрики в `metricsConfig` в `KubernetesMetricsDashboard.tsx`
3. Добавьте обработку в backend API (`backend/index.js`)

## Troubleshooting

### Prometheus не отображает метрики

1. Проверьте, что metrics exporter работает: http://localhost:8080/metrics
2. Проверьте targets в Prometheus: http://localhost:9090/targets
3. Проверьте логи: `docker-compose logs prometheus`

### Backend не может подключиться к Prometheus

1. Убедитесь, что Prometheus запущен: `docker-compose ps`
2. Проверьте health endpoint: http://localhost:3001/health
3. Проверьте логи backend: `docker-compose logs backend`

### Frontend не получает данные

1. Проверьте, что backend API доступен: http://localhost:3001/health
2. Откройте DevTools браузера и проверьте Console на наличие ошибок
3. Проверьте Network tab для анализа запросов
4. Убедитесь, что CORS настроен правильно в backend

## Технологии

- **Frontend**: React 19, TypeScript, Vite, TailwindCSS, Chart.js
- **Backend**: Node.js, Express, Axios
- **Monitoring**: Prometheus
- **Containerization**: Docker, Docker Compose
