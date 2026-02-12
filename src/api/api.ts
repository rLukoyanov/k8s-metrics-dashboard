const API_URL = '/api';

// API Response Types
export interface NamespacesResponse {
  namespaces: string[];
}

export interface DeploymentsResponse {
  deployments: string[];
}

export interface ContainersResponse {
  containers: string[];
}

export interface MetricValue {
  timestamp: number;
  value: number;
}

export interface MetricDataset {
  container: string;
  pod: string;
  values: MetricValue[];
}

export interface MetricsResponse {
  datasets: MetricDataset[];
}

export interface PromQLSeries {
  metric: Record<string, string>;
  values?: Array<[number, string]>;
}

export interface PromQLResponse {
  status: string;
  data?: {
    result: PromQLSeries[];
  };
  error?: string;
}

// API Functions

/**
 * Fetch all available namespaces
 */
export const fetchNamespaces = async (): Promise<string[]> => {
  try {
    const response = await fetch(`${API_URL}/namespaces`);
    const data: NamespacesResponse = await response.json();
    return data.namespaces || [];
  } catch (error) {
    console.error('Error fetching namespaces:', error);
    throw new Error('Failed to fetch namespaces');
  }
};

/**
 * Fetch deployments for a specific namespace
 */
export const fetchDeployments = async (namespace: string): Promise<string[]> => {
  try {
    const response = await fetch(`${API_URL}/deployments?namespace=${namespace}`);
    const data: DeploymentsResponse = await response.json();
    return data.deployments || [];
  } catch (error) {
    console.error('Error fetching deployments:', error);
    throw new Error('Failed to fetch deployments');
  }
};

/**
 * Fetch containers for a specific namespace and deployment
 */
export const fetchContainers = async (
  namespace: string,
  deployment: string
): Promise<string[]> => {
  try {
    const response = await fetch(
      `${API_URL}/containers?namespace=${namespace}&deployment=${deployment}`
    );
    const data: ContainersResponse = await response.json();
    return data.containers || [];
  } catch (error) {
    console.error('Error fetching containers:', error);
    throw new Error('Failed to fetch containers');
  }
};

/**
 * Fetch metrics for specific namespace, deployment, metric type and containers
 */
export const fetchMetrics = async (
  namespace: string,
  deployment: string,
  metric: string,
  containers: string[]
): Promise<MetricsResponse> => {
  try {
    const response = await fetch(
      `${API_URL}/metrics?namespace=${namespace}&deployment=${deployment}&metric=${metric}&containers=${containers.join(',')}`
    );
    const data: MetricsResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching metrics:', error);
    throw new Error('Failed to fetch metrics');
  }
};

/**
 * Execute a custom PromQL query
 */
export const executePromQLQuery = async (
  query: string,
  type: 'range' | 'instant' = 'range'
): Promise<PromQLResponse> => {
  try {
    const response = await fetch(`${API_URL}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, type })
    });
    const data: PromQLResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error executing PromQL query:', error);
    throw new Error('Failed to execute PromQL query');
  }
};
