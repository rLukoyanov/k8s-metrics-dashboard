// CustomPromQLCharts.tsx
import { useState } from 'react';
import type { CustomQuery } from './promql/types';
import { QueryForm } from './promql/QueryForm';
import { QueryCard } from './promql/QueryCard';
import { EmptyState } from './promql/EmptyState';
import { useQueryData } from './promql/useQueryData';
import { chartOptions } from './promql/chartConfig';

const CustomPromQLCharts = ({ selectedNamespace, selectedDeployment }: any) => {
  const [customQueries, setCustomQueries] = useState<CustomQuery[]>([
    {
      id: 1,
      name: 'CPU Throttling',
      query: selectedNamespace && selectedDeployment 
        ? `sum(rate(container_cpu_cfs_throttled_seconds_total{namespace="${selectedNamespace}", deployment="${selectedDeployment}"}[5m])) by (container, pod)`
        : 'sum(rate(container_cpu_cfs_throttled_seconds_total[5m])) by (container, pod)',
      active: true
    },
    {
      id: 2,
      name: 'Memory Cache',
      query: selectedNamespace && selectedDeployment
        ? `container_memory_cache{namespace="${selectedNamespace}", deployment="${selectedDeployment}"}`
        : 'container_memory_cache',
      active: false
    }
  ]);

  const [newQuery, setNewQuery] = useState('');
  const [newQueryName, setNewQueryName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingQuery, setEditingQuery] = useState('');
  const [editingName, setEditingName] = useState('');

  // Fetch data for active queries
  useQueryData(customQueries, setCustomQueries);

  const addCustomQuery = () => {
    if (newQuery.trim()) {
      setCustomQueries([
        ...customQueries,
        {
          id: Date.now(),
          name: newQueryName.trim() || `Custom Query ${customQueries.length + 1}`,
          query: newQuery,
          active: true
        }
      ]);
      setNewQuery('');
      setNewQueryName('');
    }
  };

  const startEditing = (query: CustomQuery) => {
    setEditingId(query.id);
    setEditingQuery(query.query);
    setEditingName(query.name);
  };

  const saveEditing = () => {
    if (editingId !== null) {
      setCustomQueries(queries =>
        queries.map(q =>
          q.id === editingId 
            ? { ...q, name: editingName, query: editingQuery, data: undefined }
            : q
        )
      );
      setEditingId(null);
      setEditingQuery('');
      setEditingName('');
    }
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingQuery('');
    setEditingName('');
  };

  const toggleQuery = (id: number) => {
    setCustomQueries(queries =>
      queries.map(q =>
        q.id === id ? { ...q, active: !q.active, data: undefined } : q
      )
    );
  };

  const deleteQuery = (id: number) => {
    setCustomQueries(queries => queries.filter(q => q.id !== id));
  };

  return (
    <div className="mt-6 space-y-4">
      <div className="bg-white rounded-xl shadow-lg border-2 border-purple-200 p-6">
        <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-purple-100">
          <h3 className="text-xl font-bold text-gray-800 flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg mr-3">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            Custom PromQL Queries
          </h3>
          <div className="flex items-center gap-2 text-sm">
            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full font-semibold">
              {customQueries.filter(q => q.active).length} активных
            </span>
            <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full font-semibold">
              {customQueries.length} всего
            </span>
          </div>
        </div>
        
        <QueryForm
          newQueryName={newQueryName}
          newQuery={newQuery}
          onQueryNameChange={setNewQueryName}
          onQueryChange={setNewQuery}
          onSubmit={addCustomQuery}
        />

        <div className="space-y-4">
          {customQueries.map(query => (
            <QueryCard
              key={query.id}
              query={query}
              isEditing={editingId === query.id}
              editingName={editingName}
              editingQuery={editingQuery}
              onEdit={startEditing}
              onSave={saveEditing}
              onCancel={cancelEditing}
              onToggle={toggleQuery}
              onDelete={deleteQuery}
              onEditNameChange={setEditingName}
              onEditQueryChange={setEditingQuery}
              chartOptions={chartOptions}
            />
          ))}
        </div>
        
        <EmptyState count={customQueries.length} />
      </div>
    </div>
  );
};

export default CustomPromQLCharts;