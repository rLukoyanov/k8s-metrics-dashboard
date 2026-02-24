import { useState } from 'react';
import KubernetesMetricsDashboard from "./components/KubernetesMetricsDashboard";
import DeploymentsPage from './components/DeploymentsPage';

function App() {
  const [activePage, setActivePage] = useState<'dashboard' | 'deployments'>('dashboard');

  return (
    <div className="w-screen">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-4">
        <nav className="mx-auto flex max-w-6xl gap-2">
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
        </nav>
      </header>

      {activePage === 'dashboard' ? <KubernetesMetricsDashboard /> : <DeploymentsPage />}
    </div>
  );
}

export default App