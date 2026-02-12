import type { CustomQuery } from './types';

interface QueryViewModeProps {
  query: CustomQuery;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const QueryViewMode = ({
  query,
  onToggle,
  onEdit,
  onDelete
}: QueryViewModeProps) => {
  return (
    <div className="flex items-center gap-4 p-4 bg-linear-to-r from-gray-50 to-slate-50 border-b-2 border-gray-200">
      <input
        type="checkbox"
        checked={query.active}
        onChange={onToggle}
        className="w-5 h-5 text-purple-600 rounded border-2 border-gray-400 focus:ring-purple-500 cursor-pointer"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-base font-bold text-gray-800">{query.name}</p>
          {query.active && (
            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
              Активен
            </span>
          )}
        </div>
        <p className="text-sm font-mono text-gray-700 bg-white px-3 py-2 rounded border border-gray-200 break-all">
          {query.query}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {query.loading && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 rounded-lg">
            <svg className="animate-spin h-5 w-5 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-xs font-semibold text-purple-700">Загрузка...</span>
          </div>
        )}
        <button
          onClick={onEdit}
          className="p-2.5 hover:bg-blue-100 rounded-lg text-blue-600 transition-colors border-2 border-transparent hover:border-blue-300 shadow-sm"
          title="Редактировать"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
        <button
          onClick={onDelete}
          className="p-2.5 hover:bg-red-100 rounded-lg text-red-600 transition-colors border-2 border-transparent hover:border-red-300 shadow-sm"
          title="Удалить"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
};
