import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { distributionData, resourceData, savingsData, trendData } from '../../data/analyticsData';

const options = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
    },
  },
};

const barOptions = {
  ...options,
  scales: {
    y: {
      beginAtZero: true,
      max: 100,
      title: {
        display: true,
        text: 'Проценты (%)',
      },
    },
  },
};

const savingsOptions = {
  ...options,
  scales: {
    y: {
      beginAtZero: true,
      title: {
        display: true,
        text: 'КТС в месяц',
      },
    },
  },
};

const ChartsSection = () => {
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Потребление CPU/Memory по серверам</h2>
          <div className="h-80">
            <Bar data={resourceData} options={barOptions} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Распределение ресурсов</h2>
          <div className="h-80 flex items-center justify-center">
            <div className="w-full max-w-md">
              <Doughnut data={distributionData} options={options} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Тренд потребления за неделю</h2>
          <div className="h-80">
            <Line data={trendData} options={options} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Количество КТС для экономии</h2>
          <div className="h-80">
            <Bar data={savingsData} options={savingsOptions} />
          </div>
          <div className="mt-4 p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-green-800">
              <span className="font-bold">Итого:</span> Оптимизация по всем направлениям позволит сэкономить до
              <span className="font-bold text-green-600"> 52 КТС</span> в месяц
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default ChartsSection;
