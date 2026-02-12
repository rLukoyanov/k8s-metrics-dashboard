import { Line } from 'react-chartjs-2';
import type { CustomQuery } from './types';

interface QueryChartProps {
  query: CustomQuery;
  chartOptions: any;
}

export const QueryChart = ({ query, chartOptions }: QueryChartProps) => {
  if (!query.active) return null;

  // Show chart
  if (query.data && !query.error) {
    return (
      <div className="p-6 bg-white">
        <div className="h-80 border border-gray-200 rounded-lg p-4 bg-linear-to-br from-white to-gray-50">
          <Line data={query.data} options={chartOptions} />
        </div>
      </div>
    );
  }

  // Show error
  if (query.error) {
    return (
      <div className="p-5 bg-linear-to-r from-red-50 to-pink-50 border-t-2 border-red-300">
        <div className="flex items-start gap-3">
          <svg className="w-6 h-6 text-red-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-bold text-red-800 mb-1">Ошибка выполнения запроса</p>
            <p className="text-sm text-red-700 font-mono bg-white px-3 py-2 rounded border border-red-200">
              {query.error}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state
  if (!query.loading && !query.data && !query.error) {
    return (
      <div className="p-5 bg-linear-to-r from-blue-50 to-cyan-50 border-t-2 border-blue-200">
        <div className="flex items-center gap-3 justify-center">
          <svg className="animate-pulse h-6 w-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <p className="text-sm font-semibold text-blue-700">Загрузка данных...</p>
        </div>
      </div>
    );
  }

  return null;
};
