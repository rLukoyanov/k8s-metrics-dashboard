import type { QueryFormProps } from './types';

export const QueryForm = ({
  newQueryName,
  newQuery,
  onQueryNameChange,
  onQueryChange,
  onSubmit
}: QueryFormProps) => {
  return (
    <div className="mb-6 p-5 bg-linear-to-br from-purple-50 to-blue-50 rounded-xl border border-purple-200">
      <p className="text-xs font-semibold text-purple-700 mb-3 uppercase tracking-wide">
        Добавить новый запрос
      </p>
      <div className="mb-3">
        <input
          type="text"
          value={newQueryName}
          onChange={(e) => onQueryNameChange(e.target.value)}
          placeholder="Название запроса (опционально)..."
          className="w-full px-4 py-2.5 bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm font-medium shadow-sm"
        />
      </div>
      <div className="flex gap-3">
        <textarea
          value={newQuery}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Введите PromQL запрос, например: sum(rate(container_cpu_usage_seconds_total[5m])) by (container)"
          className="flex-1 px-4 py-3 bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-mono text-sm resize-none shadow-sm"
          rows={3}
        />
        <button
          onClick={onSubmit}
          disabled={!newQuery.trim()}
          className="px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 active:bg-purple-800 transition-colors font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
        >
          ✨ Добавить
        </button>
      </div>
    </div>
  );
};
