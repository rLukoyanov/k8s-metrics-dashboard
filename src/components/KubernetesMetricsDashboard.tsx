import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import CustomPromQLCharts from './CustomPromQLCharts';
import { fetchNamespaces, fetchDeployments, fetchContainers, fetchMetrics } from '../api/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const KubernetesMetricsDashboard = () => {
  const [namespaces, setNamespaces] = useState([]);
  const [deployments, setDeployments] = useState([]);
  
  const [selectedNamespace, setSelectedNamespace] = useState('');
  const [selectedDeployment, setSelectedDeployment] = useState('');
  const [excludedContainers, setExcludedContainers] = useState([]);
  const [availableContainers, setAvailableContainers] = useState([]);
  const [selectedMetric, setSelectedMetric] = useState('cpu');
  const [metricsData, setMetricsData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch namespaces from API
  useEffect(() => {
    const loadNamespaces = async () => {
      try {
        const namespacesList = await fetchNamespaces();
        setNamespaces(namespacesList);
      } catch (error) {
        console.error('Error fetching namespaces:', error);
        setError('Failed to fetch namespaces');
      }
    };
    loadNamespaces();
  }, []);

  // Fetch deployments when namespace changes
  useEffect(() => {
    const loadDeployments = async () => {
      if (!selectedNamespace) {
        setDeployments([]);
        return;
      }
      
      try {
        const deploymentsList = await fetchDeployments(selectedNamespace);
        setDeployments(deploymentsList);
      } catch (error) {
        console.error('Error fetching deployments:', error);
        setError('Failed to fetch deployments');
      }
    };
    loadDeployments();
  }, [selectedNamespace]);

  // Fetch containers when deployment changes
  useEffect(() => {
    const loadContainers = async () => {
      if (!selectedNamespace || !selectedDeployment) {
        setAvailableContainers([]);
        return;
      }
      
      try {
        const containersList = await fetchContainers(selectedNamespace, selectedDeployment);
        setAvailableContainers(containersList);
      } catch (error) {
        console.error('Error fetching containers:', error);
        setError('Failed to fetch containers');
      }
    };
    loadContainers();
  }, [selectedNamespace, selectedDeployment]);

  // Fetch metrics from Prometheus
  useEffect(() => {
    const loadMetrics = async () => {
      if (!selectedNamespace || !selectedDeployment) {
        setMetricsData(null);
        return;
      }

      setLoading(true);
      setError('');

      try {
        // Get active containers (not excluded)
        const activeContainers = availableContainers.filter(
          container => !excludedContainers.includes(container)
        );

        if (activeContainers.length === 0) {
          setMetricsData({ labels: [], datasets: [] });
          setLoading(false);
          return;
        }

        const data = await fetchMetrics(
          selectedNamespace,
          selectedDeployment,
          selectedMetric,
          activeContainers
        );

        if (data.datasets) {
          // Transform API data to Chart.js format
          const allTimestamps = new Set<number>();
          data.datasets.forEach((ds: any) => {
            ds.values.forEach((v: any) => allTimestamps.add(v.timestamp));
          });

          const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);
          const labels = sortedTimestamps.map(ts => {
            const date = new Date(ts);
            return date.toLocaleTimeString();
          });

          // Color palette for containers
          const colorPalette = [
            { border: 'rgb(59, 130, 246)', background: 'rgba(59, 130, 246, 0.1)' },
            { border: 'rgb(16, 185, 129)', background: 'rgba(16, 185, 129, 0.1)' },
            { border: 'rgb(245, 158, 11)', background: 'rgba(245, 158, 11, 0.1)' },
            { border: 'rgb(239, 68, 68)', background: 'rgba(239, 68, 68, 0.1)' },
            { border: 'rgb(139, 92, 246)', background: 'rgba(139, 92, 246, 0.1)' },
            { border: 'rgb(236, 72, 153)', background: 'rgba(236, 72, 153, 0.1)' },
            { border: 'rgb(20, 184, 166)', background: 'rgba(20, 184, 166, 0.1)' },
            { border: 'rgb(168, 85, 247)', background: 'rgba(168, 85, 247, 0.1)' },
          ];

          const datasets = data.datasets.map((ds: any, index: number) => {
            const colors = colorPalette[index % colorPalette.length];
            
            // Create a map of timestamp to value
            const valueMap = new Map();
            ds.values.forEach((v: any) => {
              valueMap.set(v.timestamp, v.value);
            });

            // Create data array aligned with labels
            const chartData = sortedTimestamps.map(ts => valueMap.get(ts) || 0);

            return {
              label: `${ds.container} (${ds.pod})`,
              container: ds.container,
              pod: ds.pod,
              data: chartData,
              borderColor: colors.border,
              backgroundColor: colors.background,
              borderWidth: 2,
              pointRadius: 2,
              pointHoverRadius: 5,
              tension: 0.4,
              fill: false,
            };
          });

          setMetricsData({ labels, datasets });
        }
      } catch (error) {
        console.error('Error fetching metrics:', error);
        setError('Failed to fetch metrics data');
      } finally {
        setLoading(false);
      }
    };

    loadMetrics();
    const interval = setInterval(loadMetrics, 15000); // Refresh every 15 seconds

    return () => clearInterval(interval);
  }, [selectedNamespace, selectedDeployment, selectedMetric, excludedContainers, availableContainers]);

  // Метрики с разными PromQL запросами
  const metricsConfig = {
    cpu: {
      title: 'CPU Usage',
      unit: 'cores',
      baseValue: 30,
      variance: 20,
      promql: (container) => 
        `sum(rate(container_cpu_usage_seconds_total{namespace="${selectedNamespace}", pod=~"${selectedDeployment}-.*", container="${container}"}[5m])) by (container)`
    },
    memory: {
      title: 'Memory Usage',
      unit: 'MiB',
      baseValue: 200,
      variance: 100,
      promql: (container) => 
        `container_memory_working_set_bytes{namespace="${selectedNamespace}", pod=~"${selectedDeployment}-.*", container="${container}"}`
    },
    network_rx: {
      title: 'Network Receive',
      unit: 'bytes/s',
      baseValue: 1000,
      variance: 500,
      promql: (container) => 
        `sum(rate(container_network_receive_bytes_total{namespace="${selectedNamespace}", pod=~"${selectedDeployment}-.*", container="${container}"}[5m])) by (container)`
    },
    network_tx: {
      title: 'Network Transmit',
      unit: 'bytes/s',
      baseValue: 800,
      variance: 400,
      promql: (container) => 
        `sum(rate(container_network_transmit_bytes_total{namespace="${selectedNamespace}", pod=~"${selectedDeployment}-.*", container="${container}"}[5m])) by (container)`
    },
    disk_read: {
      title: 'Disk Read',
      unit: 'bytes/s',
      baseValue: 500,
      variance: 200,
      promql: (container) => 
        `sum(rate(container_fs_reads_bytes_total{namespace="${selectedNamespace}", pod=~"${selectedDeployment}-.*", container="${container}"}[5m])) by (container)`
    },
    disk_write: {
      title: 'Disk Write',
      unit: 'bytes/s',
      baseValue: 300,
      variance: 150,
      promql: (container) => 
        `sum(rate(container_fs_writes_bytes_total{namespace="${selectedNamespace}", pod=~"${selectedDeployment}-.*", container="${container}"}[5m])) by (container)`
    }
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          boxWidth: 8,
          padding: 20,
          font: {
            size: 12,
            weight: '500'
          }
        },
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        titleColor: '#F9FAFB',
        bodyColor: '#F9FAFB',
        borderColor: 'rgba(75, 85, 99, 0.5)',
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        boxWidth: 8,
        boxHeight: 8,
        usePointStyle: true,
        titleFont: {
          size: 13,
          weight: '600'
        },
        bodyFont: {
          size: 12,
          weight: '400',
          family: "'SF Mono', 'Monaco', 'Courier New', monospace"
        },
        callbacks: {
          title: function(tooltipItems) {
            // Show timestamp in Grafana style
            if (tooltipItems.length > 0) {
              const timestamp = tooltipItems[0].label;
              return `⏰ ${timestamp}`;
            }
            return '';
          },
          label: function(context) {
            const dataset = context.dataset as any;
            const container = dataset.container || context.dataset.label || '';
            const pod = dataset.pod || 'unknown';
            const value = context.parsed.y;
            const metric = metricsConfig[selectedMetric];
            
            // Get metric name based on type
            const metricNames = {
              'cpu': 'container_cpu_usage_seconds_total',
              'memory': 'container_memory_working_set_bytes',
              'network_rx': 'container_network_receive_bytes_total',
              'network_tx': 'container_network_transmit_bytes_total',
              'disk_read': 'container_fs_reads_bytes_total',
              'disk_write': 'container_fs_writes_bytes_total'
            };
            
            const metricName = metricNames[selectedMetric] || 'metric';
            
            // Format like Grafana: metric_name{labels}
            const grafanaStyleMetric = `${metricName}{namespace="${selectedNamespace}", deployment="${selectedDeployment}", pod="${pod}", container="${container}"}`;
            
            // Format value with appropriate precision
            let formattedValue;
            if (value < 0.01) {
              formattedValue = value.toFixed(6);
            } else if (value < 1) {
              formattedValue = value.toFixed(4);
            } else if (value < 100) {
              formattedValue = value.toFixed(2);
            } else {
              formattedValue = value.toFixed(0);
            }
            
            return [
              grafanaStyleMetric,
              `  → ${formattedValue} ${metric.unit}`
            ];
          },
          labelTextColor: function(context) {
            return context.dataset.borderColor;
          }
        }
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        title: {
          display: true,
          text: metricsConfig[selectedMetric]?.unit || '',
          font: {
            size: 11,
            weight: '500'
          }
        }
      },
      x: {
        grid: {
          display: false,
        },
        title: {
          display: true,
          text: 'Time',
          font: {
            size: 11,
            weight: '500'
          }
        }
      },
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false,
    },
  };

  const toggleContainerExclusion = (container) => {
    setExcludedContainers(prev =>
      prev.includes(container)
        ? prev.filter(c => c !== container)
        : [...prev, container]
    );
  };

  const selectAllContainers = () => {
    setExcludedContainers([]);
  };

  const excludeAllContainers = () => {
    setExcludedContainers([...availableContainers]);
  };

  const currentMetrics = metricsData || { labels: [], datasets: [] };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">
              Kubernetes Container Metrics
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Детальный мониторинг контейнеров в реальном времени
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
              Live
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* Filters Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-700 flex items-center">
              <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Фильтры
            </h2>
            {selectedDeployment && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">
                  Активных контейнеров: {availableContainers.filter(c => !excludedContainers.includes(c)).length}
                </span>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Namespace Select */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Namespace
              </label>
              <select
                value={selectedNamespace}
                onChange={(e) => {
                  setSelectedNamespace(e.target.value);
                  setSelectedDeployment('');
                  setExcludedContainers([]);
                }}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              >
                <option value="">Выберите namespace</option>
                {namespaces.map(ns => (
                  <option key={ns} value={ns}>{ns}</option>
                ))}
              </select>
            </div>

            {/* Deployment Select */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Deployment
              </label>
              <select
                value={selectedDeployment}
                onChange={(e) => {
                  setSelectedDeployment(e.target.value);
                  setExcludedContainers([]);
                }}
                disabled={!selectedNamespace}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Выберите deployment</option>
                {deployments.map(dep => (
                  <option key={dep} value={dep}>{dep}</option>
                ))}
              </select>
            </div>

            {/* Metric Select */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Метрика
              </label>
              <select
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value)}
                disabled={!selectedDeployment}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                {Object.entries(metricsConfig).map(([key, metric]) => (
                  <option key={key} value={key}>{metric.title}</option>
                ))}
              </select>
            </div>

            {/* Status Info */}
            <div className="flex items-end">
              <div className="w-full px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-600 font-medium">Текущий контекст</p>
                <p className="text-sm text-blue-800 font-semibold">
                  {selectedNamespace && selectedDeployment 
                    ? `${selectedNamespace}/${selectedDeployment}`
                    : 'Не выбрано'}
                </p>
              </div>
            </div>
          </div>

          {/* Containers Filter */}
          {availableContainers.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-medium text-gray-600">
                  Контейнеры (кликните чтобы показать/скрыть)
                </label>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={selectAllContainers}
                    className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Показать все
                  </button>
                  <button
                    onClick={excludeAllContainers}
                    className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Скрыть все
                  </button>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {availableContainers.map(container => {
                  const isExcluded = excludedContainers.includes(container);
                  return (
                    <button
                      key={container}
                      onClick={() => toggleContainerExclusion(container)}
                      className={`
                        px-4 py-2 rounded-full text-sm font-medium transition-all
                        flex items-center space-x-2
                        ${isExcluded 
                          ? 'bg-gray-100 text-gray-500 border-2 border-gray-200 hover:bg-gray-200' 
                          : 'bg-blue-100 text-blue-700 border-2 border-blue-300 hover:bg-blue-200'
                        }
                      `}
                    >
                      <span className="w-2 h-2 rounded-full" 
                        style={{ 
                          backgroundColor: isExcluded ? '#9CA3AF' : 
                            ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#A855F7'][
                              availableContainers.indexOf(container) % 8
                            ]
                        }}
                      />
                      <span>{container}</span>
                      {!isExcluded && (
                        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>

              {excludedContainers.length > 0 && (
                <p className="text-xs text-gray-500 mt-3">
                  ✕ Скрыто контейнеров: {excludedContainers.length}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Main Chart */}
        {selectedNamespace && selectedDeployment && (
          <div className="space-y-6">
            {/* Container Metrics Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-800">
                    {metricsConfig[selectedMetric].title}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Детализация по контейнерам • {metricsConfig[selectedMetric].unit}
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Среднее</p>
                    <p className="text-lg font-bold text-gray-700">
                      {currentMetrics.datasets.length > 0 ? (
                        (currentMetrics.datasets.reduce((acc, ds) => 
                          acc + ds.data.reduce((a, b) => a + b, 0) / ds.data.length, 0
                        ) / currentMetrics.datasets.length).toFixed(2)
                      ) : '0.00'}
                      <span className="text-sm font-normal text-gray-500 ml-1">
                        {metricsConfig[selectedMetric].unit}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {currentMetrics.datasets.length > 0 ? (
                <>
                  <div className="h-96">
                    <Line 
                      key={`${selectedMetric}-${selectedDeployment}-${excludedContainers.join(',')}`}
                      data={currentMetrics} 
                      options={chartOptions}
                    />
                  </div>

                  {/* Container Summary Cards */}
                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {currentMetrics.datasets.map((dataset, idx) => {
                      const avg = (dataset.data.reduce((a, b) => a + b, 0) / dataset.data.length).toFixed(2);
                      const max = Math.max(...dataset.data).toFixed(2);
                      return (
                        <div key={idx} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center">
                              <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: dataset.borderColor }}></span>
                              <span className="text-sm font-medium text-gray-700 truncate" title={dataset.label}>
                                {dataset.label}
                              </span>
                            </div>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Avg: <span className="font-semibold text-gray-700">{avg}</span></span>
                            <span className="text-gray-500">Max: <span className="font-semibold text-gray-700">{max}</span></span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="h-96 flex items-center justify-center">
                  <div className="text-center">
                    <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <h4 className="text-lg font-medium text-gray-700 mb-2">Нет данных для отображения</h4>
                    <p className="text-gray-500">Все контейнеры скрыты. Выберите контейнеры для отображения.</p>
                  </div>
                </div>
              )}
            </div>

            {/* PromQL Queries Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h4 className="text-md font-medium text-gray-700 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                PromQL Запросы
              </h4>
              <div className="space-y-3">
                {currentMetrics.datasets.map((dataset: any, idx: number) => {
                  const container = dataset.container || dataset.label;
                  const pod = dataset.pod || 'unknown';
                  
                  // Get metric name based on type
                  const metricNames = {
                    'cpu': 'container_cpu_usage_seconds_total',
                    'memory': 'container_memory_working_set_bytes',
                    'network_rx': 'container_network_receive_bytes_total',
                    'network_tx': 'container_network_transmit_bytes_total',
                    'disk_read': 'container_fs_reads_bytes_total',
                    'disk_write': 'container_fs_writes_bytes_total'
                  };
                  
                  const metricName = metricNames[selectedMetric] || 'metric';
                  const isRate = ['cpu', 'network_rx', 'network_tx', 'disk_read', 'disk_write'].includes(selectedMetric);
                  
                  let promqlQuery;
                  if (isRate) {
                    promqlQuery = `sum(rate(${metricName}{namespace="${selectedNamespace}", deployment="${selectedDeployment}", pod="${pod}", container="${container}"}[5m])) by (container, pod)`;
                  } else {
                    promqlQuery = `${metricName}{namespace="${selectedNamespace}", deployment="${selectedDeployment}", pod="${pod}", container="${container}"}`;
                  }
                  
                  return (
                    <div key={idx} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <span className="w-2 h-2 mt-2 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: dataset.borderColor }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-700 mb-1">{dataset.label}</p>
                        <code className="text-xs text-gray-600 break-all font-mono">
                          {promqlQuery}
                        </code>
                      </div>
                      <button 
                        onClick={() => navigator.clipboard.writeText(promqlQuery)}
                        className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0"
                        title="Копировать запрос"
                      >
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {(!selectedNamespace || !selectedDeployment) && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-16 text-center">
            <div className="max-w-md mx-auto">
              <svg className="w-24 h-24 mx-auto text-gray-300 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <h3 className="text-xl font-medium text-gray-700 mb-3">
                Выберите namespace и deployment
              </h3>
              <p className="text-gray-500 mb-6">
                Для просмотра детальных метрик по контейнерам необходимо выбрать пространство имен и развертывание
              </p>
              <div className="flex justify-center space-x-4 text-sm text-gray-400">
                <span className="flex items-center">1. Namespace</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="flex items-center">2. Deployment</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="flex items-center">3. Контейнеры</span>
              </div>
            </div>
          </div>
        )}

        {/* Custom PromQL Queries Section */}
        <CustomPromQLCharts 
          selectedNamespace={selectedNamespace} 
          selectedDeployment={selectedDeployment}
        />
      </div>
    </div>
  );
};

export default KubernetesMetricsDashboard;