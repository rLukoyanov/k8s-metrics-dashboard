import { useMemo, useState } from 'react';
import { loadData } from '../../data/analyticsData';
import type { LoadData } from '../../types/analytics';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'critical':
      return 'bg-red-100 text-red-800';
    case 'warning':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-green-100 text-green-800';
  }
};

const getTrendIcon = (trend: string) => {
  switch (trend) {
    case 'up':
      return <span className="text-red-500">↑</span>;
    case 'down':
      return <span className="text-green-500">↓</span>;
    default:
      return <span className="text-gray-500">→</span>;
  }
};

const getValueColor = (value: number) => {
  if (value >= 80) return 'text-red-600 font-bold';
  if (value >= 60) return 'text-yellow-600';
  return 'text-green-600';
};

const LoadTable = () => {
  const [sortField, setSortField] = useState<keyof LoadData>('cpu');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filterType, setFilterType] = useState<string>('all');

  const serverTypes = useMemo(() => ['all', ...new Set(loadData.map((item) => item.type))], []);

  const filteredAndSortedData = useMemo(() => {
    const filtered = filterType === 'all' ? loadData : loadData.filter((item) => item.type === filterType);

    return [...filtered].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });
  }, [filterType, sortDirection, sortField]);

  const handleSort = (field: keyof LoadData) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
      return;
    }

    setSortField(field);
    setSortDirection('desc');
  };

  return (
    <div className="mt-6 bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-800">Детальная таблица нагрузок</h2>

        <div className="flex items-center space-x-2">
          <label className="text-sm text-gray-600">Тип сервера:</label>
          <select className="border rounded-md px-3 py-1 text-sm" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            {serverTypes.map((type) => (
              <option key={type} value={type}>
                {type === 'all' ? 'Все' : type}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('server')}
              >
                Сервер {sortField === 'server' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('type')}
              >
                Тип {sortField === 'type' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('cpu')}
              >
                CPU % {sortField === 'cpu' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('memory')}
              >
                Memory % {sortField === 'memory' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('disk')}
              >
                Disk % {sortField === 'disk' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('network')}
              >
                Network % {sortField === 'network' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('requests')}
              >
                Req/s {sortField === 'requests' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Статус</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Тренд</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAndSortedData.map((item) => (
              <tr key={item.server} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.server}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.type}</td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm ${getValueColor(item.cpu)}`}>{item.cpu}%</td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm ${getValueColor(item.memory)}`}>{item.memory}%</td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm ${getValueColor(item.disk)}`}>{item.disk}%</td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm ${getValueColor(item.network)}`}>{item.network}%</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.requests.toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(item.status)}`}>
                    {item.status === 'critical' ? 'Критично' : item.status === 'warning' ? 'Внимание' : 'Норма'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{getTrendIcon(item.trend)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <span className="text-sm text-gray-600">Всего серверов:</span>
            <span className="ml-2 font-semibold">{loadData.length}</span>
          </div>
          <div>
            <span className="text-sm text-gray-600">Критичных:</span>
            <span className="ml-2 font-semibold text-red-600">{loadData.filter((item) => item.status === 'critical').length}</span>
          </div>
          <div>
            <span className="text-sm text-gray-600">Требуют внимания:</span>
            <span className="ml-2 font-semibold text-yellow-600">{loadData.filter((item) => item.status === 'warning').length}</span>
          </div>
          <div>
            <span className="text-sm text-gray-600">Средняя загрузка CPU:</span>
            <span className="ml-2 font-semibold">
              {(loadData.reduce((acc, item) => acc + item.cpu, 0) / loadData.length).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadTable;
