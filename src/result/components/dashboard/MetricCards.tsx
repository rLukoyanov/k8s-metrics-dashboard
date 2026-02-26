import { metricCards } from '../../data/analyticsData';

const MetricCards = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {metricCards.map((card) => (
        <div key={card.title} className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{card.title}</p>
              <p className={`text-2xl font-bold ${card.iconColorClass}`}>{card.value}</p>
              <p className="text-xs text-gray-500 mt-1">{card.subtitle}</p>
            </div>
            <div className={`w-12 h-12 ${card.iconBgClass} rounded-full flex items-center justify-center`}>
              <svg className={`w-6 h-6 ${card.iconColorClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={card.iconPath} />
              </svg>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MetricCards;
