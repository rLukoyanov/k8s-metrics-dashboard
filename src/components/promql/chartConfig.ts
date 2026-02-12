export const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
      labels: {
        usePointStyle: true,
        boxWidth: 8,
        padding: 15,
        font: { size: 11, weight: 'normal' as const }
      },
    },
    tooltip: {
      mode: 'index' as const,
      intersect: false,
      backgroundColor: 'rgba(17, 24, 39, 0.95)',
      titleColor: '#F9FAFB',
      bodyColor: '#F9FAFB',
      borderColor: 'rgba(75, 85, 99, 0.5)',
      borderWidth: 1,
      padding: 10,
      bodyFont: { size: 11, family: "'SF Mono', 'Monaco', 'Courier New', monospace" },
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: { color: 'rgba(0, 0, 0, 0.05)' },
    },
    x: {
      grid: { display: false },
    },
  },
};
