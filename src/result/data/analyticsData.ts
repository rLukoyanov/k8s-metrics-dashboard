import type { LoadData, MetricCard, Recommendation } from '../types/analytics';

export const resourceData = {
  labels: ['Web Server', 'DB Server', 'App Server', 'Cache Server', 'Worker'],
  datasets: [
    {
      label: 'CPU Usage (%)',
      data: [65, 82, 45, 30, 72],
      backgroundColor: 'rgba(54, 162, 235, 0.5)',
      borderColor: 'rgba(54, 162, 235, 1)',
      borderWidth: 1,
    },
    {
      label: 'Memory Usage (%)',
      data: [58, 76, 52, 44, 68],
      backgroundColor: 'rgba(255, 99, 132, 0.5)',
      borderColor: 'rgba(255, 99, 132, 1)',
      borderWidth: 1,
    },
  ],
};

export const savingsData = {
  labels: ['Оптимизация кода', 'Удаление неисп. ресурсов', 'Автоматизация', 'Контейнеризация', 'Кэширование'],
  datasets: [
    {
      label: 'Потенциал экономии (КТС/мес)',
      data: [12, 8, 15, 10, 7],
      backgroundColor: [
        'rgba(75, 192, 192, 0.5)',
        'rgba(153, 102, 255, 0.5)',
        'rgba(255, 159, 64, 0.5)',
        'rgba(255, 205, 86, 0.5)',
        'rgba(201, 203, 207, 0.5)',
      ],
      borderColor: [
        'rgba(75, 192, 192, 1)',
        'rgba(153, 102, 255, 1)',
        'rgba(255, 159, 64, 1)',
        'rgba(255, 205, 86, 1)',
        'rgba(201, 203, 207, 1)',
      ],
      borderWidth: 1,
    },
  ],
};

export const distributionData = {
  labels: ['Вычислительные ресурсы', 'Память', 'Хранилище', 'Сеть'],
  datasets: [
    {
      data: [45, 30, 15, 10],
      backgroundColor: [
        'rgba(54, 162, 235, 0.8)',
        'rgba(255, 99, 132, 0.8)',
        'rgba(75, 192, 192, 0.8)',
        'rgba(255, 159, 64, 0.8)',
      ],
      borderColor: [
        'rgba(54, 162, 235, 1)',
        'rgba(255, 99, 132, 1)',
        'rgba(75, 192, 192, 1)',
        'rgba(255, 159, 64, 1)',
      ],
      borderWidth: 1,
    },
  ],
};

export const trendData = {
  labels: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
  datasets: [
    {
      label: 'CPU Trend',
      data: [55, 62, 58, 71, 68, 45, 42],
      borderColor: 'rgba(54, 162, 235, 1)',
      backgroundColor: 'rgba(54, 162, 235, 0.1)',
      fill: true,
      tension: 0.4,
    },
    {
      label: 'Memory Trend',
      data: [48, 52, 55, 63, 60, 50, 46],
      borderColor: 'rgba(255, 99, 132, 1)',
      backgroundColor: 'rgba(255, 99, 132, 0.1)',
      fill: true,
      tension: 0.4,
    },
  ],
};

export const loadData: LoadData[] = [
  {
    server: 'web-01',
    type: 'Web Server',
    cpu: 65,
    memory: 58,
    disk: 42,
    network: 35,
    requests: 12500,
    status: 'warning',
    trend: 'up',
  },
  {
    server: 'web-02',
    type: 'Web Server',
    cpu: 48,
    memory: 52,
    disk: 38,
    network: 28,
    requests: 9800,
    status: 'normal',
    trend: 'stable',
  },
  {
    server: 'db-master',
    type: 'Database',
    cpu: 82,
    memory: 76,
    disk: 68,
    network: 45,
    requests: 5600,
    status: 'critical',
    trend: 'up',
  },
  {
    server: 'db-slave',
    type: 'Database',
    cpu: 45,
    memory: 48,
    disk: 52,
    network: 22,
    requests: 3200,
    status: 'normal',
    trend: 'down',
  },
  {
    server: 'app-01',
    type: 'App Server',
    cpu: 45,
    memory: 52,
    disk: 35,
    network: 42,
    requests: 15200,
    status: 'normal',
    trend: 'stable',
  },
  {
    server: 'app-02',
    type: 'App Server',
    cpu: 58,
    memory: 61,
    disk: 40,
    network: 48,
    requests: 16800,
    status: 'warning',
    trend: 'up',
  },
  {
    server: 'cache-01',
    type: 'Cache',
    cpu: 30,
    memory: 44,
    disk: 25,
    network: 65,
    requests: 45200,
    status: 'normal',
    trend: 'down',
  },
  {
    server: 'worker-01',
    type: 'Worker',
    cpu: 72,
    memory: 68,
    disk: 55,
    network: 38,
    requests: 8900,
    status: 'warning',
    trend: 'up',
  },
  {
    server: 'worker-02',
    type: 'Worker',
    cpu: 55,
    memory: 52,
    disk: 48,
    network: 32,
    requests: 7600,
    status: 'normal',
    trend: 'stable',
  },
];

export const metricCards: MetricCard[] = [
  {
    title: 'Средний CPU',
    value: '58.8%',
    subtitle: '+5.2% за неделю',
    iconBgClass: 'bg-blue-100',
    iconColorClass: 'text-blue-600',
    iconPath:
      'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z',
  },
  {
    title: 'Средняя память',
    value: '59.6%',
    subtitle: '+3.8% за неделю',
    iconBgClass: 'bg-pink-100',
    iconColorClass: 'text-pink-600',
    iconPath: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4',
  },
  {
    title: 'Пиковое потребление',
    value: '82%',
    subtitle: 'db-master, 14:30',
    iconBgClass: 'bg-orange-100',
    iconColorClass: 'text-orange-600',
    iconPath: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
  },
  {
    title: 'Потенциал экономии',
    value: '52 КТС',
    subtitle: 'до 15% от текущих',
    iconBgClass: 'bg-green-100',
    iconColorClass: 'text-green-600',
    iconPath: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
];

export const recommendations: Recommendation[] = [
  {
    server: 'db-master',
    issue: 'Высокий CPU (82%)',
    recommendation: 'Оптимизировать запросы, добавить индексы',
    potential: '15 КТС',
  },
  {
    server: 'web-01',
    issue: 'Неэффективное кэширование',
    recommendation: 'Внедрить Redis кэш',
    potential: '8 КТС',
  },
  {
    server: 'worker-01',
    issue: 'Избыточное потребление памяти',
    recommendation: 'Оптимизировать код, убрать утечки',
    potential: '12 КТС',
  },
  {
    server: 'app-02',
    issue: 'Рост нагрузки на CPU',
    recommendation: 'Масштабирование горизонтальное',
    potential: '10 КТС',
  },
];
