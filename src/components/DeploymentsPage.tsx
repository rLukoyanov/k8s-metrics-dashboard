import { useEffect, useMemo, useState } from 'react';
import { fetchDeployments, fetchNamespaces } from '../api/api';

const DeploymentsPage = () => {
  const [namespaces, setNamespaces] = useState<string[]>([]);
  const [selectedNamespace, setSelectedNamespace] = useState<string>('');
  const [deployments, setDeployments] = useState<string[]>([]);
  const [loadingNamespaces, setLoadingNamespaces] = useState<boolean>(true);
  const [loadingDeployments, setLoadingDeployments] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const loadNamespaces = async () => {
      setLoadingNamespaces(true);
      setError('');

      try {
        const namespacesList = await fetchNamespaces();
        setNamespaces(namespacesList);

        if (namespacesList.length > 0) {
          setSelectedNamespace(namespacesList[0]);
        }
      } catch {
        setError('Не удалось загрузить namespaces');
      } finally {
        setLoadingNamespaces(false);
      }
    };

    loadNamespaces();
  }, []);

  useEffect(() => {
    const loadDeployments = async () => {
      if (!selectedNamespace) {
        setDeployments([]);
        return;
      }

      setLoadingDeployments(true);
      setError('');

      try {
        const deploymentsList = await fetchDeployments(selectedNamespace);
        setDeployments(deploymentsList);
      } catch {
        setError('Не удалось загрузить deployments');
        setDeployments([]);
      } finally {
        setLoadingDeployments(false);
      }
    };

    loadDeployments();
  }, [selectedNamespace]);

  const rows = useMemo(
    () =>
      deployments.map((deployment, index) => ({
        id: index + 1,
        name: deployment,
        namespace: selectedNamespace,
      })),
    [deployments, selectedNamespace]
  );

  return (
    <div className="min-h-screen bg-gray-100 p-6 text-gray-900">
      <div className="mx-auto max-w-6xl rounded-xl bg-white p-6 shadow">
        <h1 className="mb-4 text-2xl font-semibold">Список деплойментов</h1>

        <div className="mb-4 flex items-center gap-3">
          <label htmlFor="namespace" className="text-sm font-medium text-gray-700">
            Namespace
          </label>
          <select
            id="namespace"
            value={selectedNamespace}
            onChange={(event) => setSelectedNamespace(event.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            disabled={loadingNamespaces || namespaces.length === 0}
          >
            {namespaces.map((namespace) => (
              <option key={namespace} value={namespace}>
                {namespace}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {(loadingNamespaces || loadingDeployments) && (
          <div className="mb-4 text-sm text-gray-600">Загрузка данных...</div>
        )}

        {!loadingDeployments && rows.length === 0 && !error && (
          <div className="mb-4 text-sm text-gray-600">Деплойменты не найдены</div>
        )}

        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-700">#</th>
                <th className="px-4 py-3 font-medium text-gray-700">Deployment</th>
                <th className="px-4 py-3 font-medium text-gray-700">Namespace</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {rows.map((row) => (
                <tr key={`${row.namespace}-${row.name}`}>
                  <td className="px-4 py-3 text-gray-600">{row.id}</td>
                  <td className="px-4 py-3 text-gray-900">{row.name}</td>
                  <td className="px-4 py-3 text-gray-700">{row.namespace}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DeploymentsPage;