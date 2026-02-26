import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js';
import ChartsSection from './components/dashboard/ChartsSection';
import DashboardHeader from './components/dashboard/DashboardHeader';
import LoadTable from './components/dashboard/LoadTable';
import MetricCards from './components/dashboard/MetricCards';
import RecommendationsTable from './components/dashboard/RecommendationsTable';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler,
);

const App = () => {
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <DashboardHeader />
      <MetricCards />
      <ChartsSection />
      <LoadTable />
      <RecommendationsTable />
    </div>
  );
};

export default App;
