import { recommendations } from '../../data/analyticsData';

const RecommendationsTable = () => {
  return (
    <div className="mt-6 bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800">Рекомендации по оптимизации</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Сервер</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Проблема</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Рекомендация</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Потенциал (КТС)</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {recommendations.map((item) => (
              <tr key={item.server}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.server}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.issue}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.recommendation}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">{item.potential}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RecommendationsTable;
