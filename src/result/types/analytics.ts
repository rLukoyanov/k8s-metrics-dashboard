export interface LoadData {
  server: string;
  type: string;
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  requests: number;
  status: 'critical' | 'warning' | 'normal';
  trend: 'up' | 'down' | 'stable';
}

export interface Recommendation {
  server: string;
  issue: string;
  recommendation: string;
  potential: string;
}

export interface MetricCard {
  title: string;
  value: string;
  subtitle: string;
  iconBgClass: string;
  iconColorClass: string;
  iconPath: string;
}
