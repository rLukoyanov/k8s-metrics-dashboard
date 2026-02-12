import { useEffect } from 'react';
import type { CustomQuery } from './types';
import { executePromQLQuery } from '../../api/api';

const colorPalette = [
  { border: 'rgb(59, 130, 246)', background: 'rgba(59, 130, 246, 0.1)' },
  { border: 'rgb(16, 185, 129)', background: 'rgba(16, 185, 129, 0.1)' },
  { border: 'rgb(245, 158, 11)', background: 'rgba(245, 158, 11, 0.1)' },
  { border: 'rgb(239, 68, 68)', background: 'rgba(239, 68, 68, 0.1)' },
  { border: 'rgb(139, 92, 246)', background: 'rgba(139, 92, 246, 0.1)' },
  { border: 'rgb(236, 72, 153)', background: 'rgba(236, 72, 153, 0.1)' },
];

export const useQueryData = (
  customQueries: CustomQuery[],
  setCustomQueries: React.Dispatch<React.SetStateAction<CustomQuery[]>>
) => {
  useEffect(() => {
    const fetchQueryData = async (query: CustomQuery) => {
      if (!query.active) return;

      setCustomQueries(prev => prev.map(q => 
        q.id === query.id ? { ...q, loading: true, error: undefined } : q
      ));

      try {
        const result = await executePromQLQuery(query.query, 'range');

        if (result.status === 'success' && result.data?.result) {
          // Transform to chart format
          const allTimestamps = new Set<number>();
          result.data.result.forEach((series: any) => {
            series.values?.forEach((v: any) => {
              allTimestamps.add(v[0] * 1000);
            });
          });

          const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);
          const labels = sortedTimestamps.map(ts => {
            const date = new Date(ts);
            return date.toLocaleTimeString();
          });

          const datasets = result.data.result.map((series: any, index: number) => {
            const colors = colorPalette[index % colorPalette.length];
            
            // Create label from metric
            const metricLabels = Object.entries(series.metric)
              .filter(([key]) => key !== '__name__')
              .map(([key, value]) => `${key}="${value}"`)
              .join(', ');
            
            const label = metricLabels || series.metric.__name__ || `Series ${index + 1}`;

            // Create value map
            const valueMap = new Map();
            series.values?.forEach((v: any) => {
              valueMap.set(v[0] * 1000, parseFloat(v[1]));
            });

            const data = sortedTimestamps.map(ts => valueMap.get(ts) || null);

            return {
              label,
              data,
              borderColor: colors.border,
              backgroundColor: colors.background,
              borderWidth: 2,
              pointRadius: 2,
              pointHoverRadius: 4,
              tension: 0.4,
              fill: false,
              spanGaps: true,
            };
          });

          setCustomQueries(prev => prev.map(q =>
            q.id === query.id 
              ? { ...q, data: { labels, datasets }, loading: false, error: undefined }
              : q
          ));
        } else {
          throw new Error(result.error || 'No data returned');
        }
      } catch (error: any) {
        console.error('Error fetching query data:', error);
        setCustomQueries(prev => prev.map(q =>
          q.id === query.id 
            ? { ...q, loading: false, error: error.message || 'Failed to fetch data' }
            : q
        ));
      }
    };

    // Fetch data for all active queries
    customQueries.forEach(query => {
      if (query.active) {
        fetchQueryData(query);
      }
    });

    // Refresh every 15 seconds
    const interval = setInterval(() => {
      customQueries.forEach(query => {
        if (query.active) {
          fetchQueryData(query);
        }
      });
    }, 15000);

    return () => clearInterval(interval);
  }, [customQueries.map(q => ({ id: q.id, query: q.query, active: q.active })).map(q => JSON.stringify(q)).join(','), setCustomQueries]);
};
