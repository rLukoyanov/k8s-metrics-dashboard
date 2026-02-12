const http = require('http');

// Configuration for generating metrics
const NAMESPACES = ['default', 'kube-system', 'production', 'staging', 'development'];
const DEPLOYMENTS = ['nginx', 'api-server', 'frontend', 'backend', 'redis', 'postgresql'];
const CONTAINERS = {
  'nginx': ['nginx-main', 'nginx-sidecar', 'nginx-exporter'],
  'api-server': ['api', 'auth', 'cache', 'logger'],
  'frontend': ['react-app', 'nginx-static', 'node-exporter'],
  'backend': ['spring-boot', 'postgres-exporter', 'redis-client'],
  'redis': ['redis-server', 'redis-sentinel', 'redis-exporter'],
  'postgresql': ['postgres', 'pgbouncer', 'backup-agent']
};

// Helper function to generate random value
function randomValue(min, max) {
  return Math.random() * (max - min) + min;
}

// Generate metrics in Prometheus format
function generateMetrics() {
  let metrics = [];
  const timestamp = Date.now();

  NAMESPACES.forEach(namespace => {
    DEPLOYMENTS.forEach(deployment => {
      const containers = CONTAINERS[deployment] || ['main-container'];
      
      containers.forEach(container => {
        const podName = `${deployment}-${Math.random().toString(36).substring(7)}`;
        
        // CPU metrics
        const cpuUsage = randomValue(0.1, 2.5);
        metrics.push(
          `container_cpu_usage_seconds_total{namespace="${namespace}",pod="${podName}",container="${container}",deployment="${deployment}"} ${cpuUsage.toFixed(4)}`
        );
        
        const cpuThrottled = randomValue(0, 0.5);
        metrics.push(
          `container_cpu_cfs_throttled_seconds_total{namespace="${namespace}",pod="${podName}",container="${container}",deployment="${deployment}"} ${cpuThrottled.toFixed(4)}`
        );
        
        // Memory metrics
        const memoryUsage = randomValue(100000000, 500000000); // 100MB - 500MB
        metrics.push(
          `container_memory_working_set_bytes{namespace="${namespace}",pod="${podName}",container="${container}",deployment="${deployment}"} ${memoryUsage.toFixed(0)}`
        );
        
        const memoryCache = randomValue(10000000, 50000000); // 10MB - 50MB
        metrics.push(
          `container_memory_cache{namespace="${namespace}",pod="${podName}",container="${container}",deployment="${deployment}"} ${memoryCache.toFixed(0)}`
        );
        
        // Network metrics
        const networkRx = randomValue(1000, 10000);
        metrics.push(
          `container_network_receive_bytes_total{namespace="${namespace}",pod="${podName}",container="${container}",deployment="${deployment}"} ${networkRx.toFixed(0)}`
        );
        
        const networkTx = randomValue(500, 8000);
        metrics.push(
          `container_network_transmit_bytes_total{namespace="${namespace}",pod="${podName}",container="${container}",deployment="${deployment}"} ${networkTx.toFixed(0)}`
        );
        
        // Disk metrics
        const diskRead = randomValue(100, 5000);
        metrics.push(
          `container_fs_reads_bytes_total{namespace="${namespace}",pod="${podName}",container="${container}",deployment="${deployment}"} ${diskRead.toFixed(0)}`
        );
        
        const diskWrite = randomValue(50, 3000);
        metrics.push(
          `container_fs_writes_bytes_total{namespace="${namespace}",pod="${podName}",container="${container}",deployment="${deployment}"} ${diskWrite.toFixed(0)}`
        );
      });
    });
  });

  return metrics.join('\n');
}

// Create HTTP server
const server = http.createServer((req, res) => {
  if (req.url === '/metrics' && req.method === 'GET') {
    const metrics = generateMetrics();
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(metrics);
  } else if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'healthy' }));
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`🎯 K8s Metrics Mock Exporter running on port ${PORT}`);
  console.log(`📊 Metrics available at http://localhost:${PORT}/metrics`);
});
