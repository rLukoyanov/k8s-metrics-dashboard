#!/bin/bash

echo "🚀 Starting Kubernetes Metrics Monitoring Stack..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "❌ Docker is not running!"
  echo "Please start Docker Desktop and try again."
  exit 1
fi

echo "✅ Docker is running"
echo ""

# Start Docker services
echo "📦 Starting Docker containers..."
docker-compose up -d

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 5

# Check services
echo ""
echo "🔍 Checking service status..."
echo ""

# Check Prometheus
if curl -s http://localhost:9090/-/healthy > /dev/null 2>&1; then
  echo "✅ Prometheus is running at http://localhost:9090"
else
  echo "⚠️  Prometheus is starting... (may take a few seconds)"
fi

# Check Backend API
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
  echo "✅ Backend API is running at http://localhost:3001"
else
  echo "⚠️  Backend API is starting... (may take a few seconds)"
fi

# Check Metrics Exporter
if curl -s http://localhost:8080/health > /dev/null 2>&1; then
  echo "✅ Metrics Exporter is running at http://localhost:8080"
else
  echo "⚠️  Metrics Exporter is starting... (may take a few seconds)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Infrastructure is starting up!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Available services:"
echo "  • Prometheus UI:     http://localhost:9090"
echo "  • Backend API:       http://localhost:3001"
echo "  • Metrics Exporter:  http://localhost:8080/metrics"
echo ""
echo "🌐 Now run frontend:"
echo "  npm run dev"
echo ""
echo "📖 See SETUP.md for detailed documentation"
echo ""
