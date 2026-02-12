const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3001;
const PROMETHEUS_URL = process.env.PROMETHEUS_URL || 'http://localhost:9090';

app.use(cors());
app.use(express.json());

// Helper function to query Prometheus
async function queryPrometheus(query) {
  try {
    const response = await axios.get(`${PROMETHEUS_URL}/api/v1/query`, {
      params: { query }
    });
    return response.data;
  } catch (error) {
    console.error('Error querying Prometheus:', error.message);
    throw error;
  }
}

// Helper function to query Prometheus range
async function queryPrometheusRange(query, start, end, step) {
  try {
    const response = await axios.get(`${PROMETHEUS_URL}/api/v1/query_range`, {
      params: { query, start, end, step }
    });
    return response.data;
  } catch (error) {
    console.error('Error querying Prometheus range:', error.message);
    throw error;
  }
}

// Get all namespaces
app.get('/api/namespaces', async (req, res) => {
  try {
    const query = 'group by (namespace) (container_cpu_usage_seconds_total)';
    const result = await queryPrometheus(query);
    
    if (result.status === 'success') {
      const namespaces = result.data.result.map(item => item.metric.namespace);
      res.json({ namespaces: [...new Set(namespaces)].sort() });
    } else {
      res.status(500).json({ error: 'Failed to fetch namespaces' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get deployments for a namespace
app.get('/api/deployments', async (req, res) => {
  try {
    const { namespace } = req.query;
    
    if (!namespace) {
      return res.status(400).json({ error: 'Namespace parameter is required' });
    }
    
    const query = `group by (deployment) (container_cpu_usage_seconds_total{namespace="${namespace}"})`;
    const result = await queryPrometheus(query);
    
    if (result.status === 'success') {
      const deployments = result.data.result.map(item => item.metric.deployment);
      res.json({ deployments: [...new Set(deployments)].filter(Boolean).sort() });
    } else {
      res.status(500).json({ error: 'Failed to fetch deployments' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get containers for a deployment
app.get('/api/containers', async (req, res) => {
  try {
    const { namespace, deployment } = req.query;
    
    if (!namespace || !deployment) {
      return res.status(400).json({ error: 'Namespace and deployment parameters are required' });
    }
    
    const query = `group by (container) (container_cpu_usage_seconds_total{namespace="${namespace}",deployment="${deployment}"})`;
    const result = await queryPrometheus(query);
    
    if (result.status === 'success') {
      const containers = result.data.result.map(item => item.metric.container);
      res.json({ containers: [...new Set(containers)].filter(Boolean).sort() });
    } else {
      res.status(500).json({ error: 'Failed to fetch containers' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get metrics data
app.get('/api/metrics', async (req, res) => {
  try {
    const { namespace, deployment, metric, containers, duration = '5m' } = req.query;
    
    if (!namespace || !deployment || !metric) {
      return res.status(400).json({ error: 'Namespace, deployment, and metric parameters are required' });
    }
    
    // Parse containers (comma-separated list)
    const containerList = containers ? containers.split(',') : [];
    
    // Build PromQL query based on metric type
    let promqlQuery = '';
    const containerFilter = containerList.length > 0 
      ? `container=~"${containerList.join('|')}"` 
      : 'container!=""';
    
    switch (metric) {
      case 'cpu':
        promqlQuery = `sum(rate(container_cpu_usage_seconds_total{namespace="${namespace}",deployment="${deployment}",${containerFilter}}[${duration}])) by (container, pod)`;
        break;
      case 'memory':
        promqlQuery = `container_memory_working_set_bytes{namespace="${namespace}",deployment="${deployment}",${containerFilter}}`;
        break;
      case 'network_rx':
        promqlQuery = `sum(rate(container_network_receive_bytes_total{namespace="${namespace}",deployment="${deployment}",${containerFilter}}[${duration}])) by (container, pod)`;
        break;
      case 'network_tx':
        promqlQuery = `sum(rate(container_network_transmit_bytes_total{namespace="${namespace}",deployment="${deployment}",${containerFilter}}[${duration}])) by (container, pod)`;
        break;
      case 'disk_read':
        promqlQuery = `sum(rate(container_fs_reads_bytes_total{namespace="${namespace}",deployment="${deployment}",${containerFilter}}[${duration}])) by (container, pod)`;
        break;
      case 'disk_write':
        promqlQuery = `sum(rate(container_fs_writes_bytes_total{namespace="${namespace}",deployment="${deployment}",${containerFilter}}[${duration}])) by (container, pod)`;
        break;
      default:
        return res.status(400).json({ error: 'Invalid metric type' });
    }
    
    // Query Prometheus for range data (last 5 minutes)
    const end = Math.floor(Date.now() / 1000);
    const start = end - 300; // 5 minutes ago
    const step = 15; // 15 seconds
    
    const result = await queryPrometheusRange(promqlQuery, start, end, step);
    
    if (result.status === 'success') {
      // Transform data for frontend
      const datasets = result.data.result.map(series => {
        const container = series.metric.container;
        const pod = series.metric.pod || 'unknown';
        const values = series.values.map(([timestamp, value]) => ({
          timestamp: timestamp * 1000, // Convert to milliseconds
          value: parseFloat(value)
        }));
        
        return {
          container,
          pod,
          values
        };
      });
      
      res.json({ 
        query: promqlQuery,
        datasets 
      });
    } else {
      res.status(500).json({ error: 'Failed to fetch metrics data' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Custom PromQL query endpoint
app.post('/api/query', async (req, res) => {
  try {
    const { query, type = 'instant' } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }
    
    let result;
    if (type === 'range') {
      const end = Math.floor(Date.now() / 1000);
      const start = end - 300;
      const step = 15;
      result = await queryPrometheusRange(query, start, end, step);
    } else {
      result = await queryPrometheus(query);
    }
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', prometheus: PROMETHEUS_URL });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend API server running on port ${PORT}`);
  console.log(`📊 Prometheus URL: ${PROMETHEUS_URL}`);
  console.log(`\nAvailable endpoints:`);
  console.log(`  GET  /api/namespaces`);
  console.log(`  GET  /api/deployments?namespace=<name>`);
  console.log(`  GET  /api/containers?namespace=<name>&deployment=<name>`);
  console.log(`  GET  /api/metrics?namespace=<name>&deployment=<name>&metric=<type>&containers=<list>`);
  console.log(`  POST /api/query`);
  console.log(`  GET  /health`);
});
