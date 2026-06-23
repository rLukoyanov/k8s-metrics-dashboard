export interface PromSeries {
  metric: {
    __name__: string;
    container: string;
    pod: string;
    namespace: string;
    deployment: string;
    instance: string;
    job: string;
  };
  values: Array<[number, string]>;
}

export interface PromConfig {
  id: string;
  metricName: string;
  title: string;
  subtitle: string;
  unit: string;
  containers: readonly string[];
  bases: readonly number[];
  amps: readonly number[];
  noises: readonly number[];
}

export const generateTimestamps = (count: number): number[] => {
  const now = Math.floor(Date.now() / 1000);
  const step = 30;
  return Array.from({ length: count }, (_, i) => now - (count - 1 - i) * step);
};

export const generatePromSeries = (
  metricName: string,
  container: string,
  timestamps: number[],
  base: number,
  amp: number,
  noise: number,
  phase: number,
): PromSeries => {
  const podId = Math.random().toString(36).substring(2, 6);
  return {
    metric: {
      __name__: metricName,
      container,
      pod: `pod-${podId}`,
      namespace: 'default',
      deployment: 'my-app',
      instance: '10.0.0.1:8080',
      job: 'kubernetes',
    },
    values: timestamps.map((ts, i) => {
      const trend = Math.sin((i / timestamps.length) * Math.PI * 0.8);
      const cycle = Math.sin(i * 0.1 + phase);
      const value = base + amp * trend * 0.5 + amp * cycle * 0.3 + (Math.random() - 0.5) * noise;
      return [ts, Math.max(0, value).toFixed(4)] as [number, string];
    }),
  };
};

export const promConfigs: PromConfig[] = [
  {
    id: 'cpu',
    metricName: 'container_cpu_usage_seconds_total',
    title: 'CPU Usage',
    subtitle: 'container_cpu_usage_seconds_total',
    unit: 'cores',
    containers: ['app', 'sidecar'],
    bases: [0.35, 0.12],
    amps: [0.25, 0.08],
    noises: [0.08, 0.04],
  },
  {
    id: 'memory',
    metricName: 'container_memory_working_set_bytes',
    title: 'Memory Usage',
    subtitle: 'container_memory_working_set_bytes',
    unit: 'bytes',
    containers: ['app', 'sidecar'],
    bases: [256_000_000, 128_000_000],
    amps: [128_000_000, 64_000_000],
    noises: [16_000_000, 8_000_000],
  },
  {
    id: 'network',
    metricName: 'container_network_receive_bytes_total',
    title: 'Network Receive',
    subtitle: 'container_network_receive_bytes_total',
    unit: 'bytes/s',
    containers: ['app', 'sidecar', 'proxy'],
    bases: [1500, 800, 300],
    amps: [500, 400, 150],
    noises: [100, 80, 30],
  },
];
