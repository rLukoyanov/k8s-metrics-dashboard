import { useState } from 'react';
import KubernetesMetricsDashboard from "./components/KubernetesMetricsDashboard";
import DeploymentsPage from './components/DeploymentsPage';
import GradientLinePage from './components/GradientLinePage';
import ReactFlowPage from './components/ReactFlowPage';
import ResultPage from './result/App';

function App() {
  const [activePage, setActivePage] = useState<'dashboard' | 'deployments' | 'result' | 'gradient-line' | 'reactflow'>('dashboard');

  return (
    <div className="w-screen pt-16">
      <header className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-gray-200 bg-white px-6">
        <nav className="mx-auto flex h-16 w-full max-w-6xl items-center gap-2">
          <button
            type="button"
            onClick={() => setActivePage('dashboard')}
            className={`rounded-md px-4 py-2 text-sm font-medium ${
              activePage === 'dashboard'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Dashboard
          </button>
          <button
            type="button"
            onClick={() => setActivePage('deployments')}
            className={`rounded-md px-4 py-2 text-sm font-medium ${
              activePage === 'deployments'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Deployments
          </button>
          <button
            type="button"
            onClick={() => setActivePage('result')}
            className={`rounded-md px-4 py-2 text-sm font-medium ${
              activePage === 'result'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Result
          </button>
          <button
            type="button"
            onClick={() => setActivePage('gradient-line')}
            className={`rounded-md px-4 py-2 text-sm font-medium ${
              activePage === 'gradient-line'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Gradient Line
          </button>
          <button
            type="button"
            onClick={() => setActivePage('reactflow')}
            className={`rounded-md px-4 py-2 text-sm font-medium ${
              activePage === 'reactflow'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            React Flow
          </button>
        </nav>
      </header>

      {activePage === 'dashboard' && <KubernetesMetricsDashboard />}
      {activePage === 'deployments' && <DeploymentsPage />}
      {activePage === 'result' && <ResultPage />}
      {activePage === 'gradient-line' && <GradientLinePage />}
      {activePage === 'reactflow' && <ReactFlowPage />}
    </div>
  );
}

export default App