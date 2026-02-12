interface QueryEditModeProps {
  editingName: string;
  editingQuery: string;
  onNameChange: (name: string) => void;
  onQueryChange: (query: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export const QueryEditMode = ({
  editingName,
  editingQuery,
  onNameChange,
  onQueryChange,
  onSave,
  onCancel
}: QueryEditModeProps) => {
  return (
    <div className="p-5 bg-linear-to-br from-blue-50 to-indigo-50 border-b-2 border-blue-200">
      <label className="block text-xs font-semibold text-blue-700 mb-1">Название</label>
      <input
        type="text"
        value={editingName}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder="Название..."
        className="w-full mb-3 px-4 py-2.5 bg-white border-2 border-blue-300 rounded-lg text-sm font-medium shadow-sm focus:ring-2 focus:ring-blue-500"
      />
      <label className="block text-xs font-semibold text-blue-700 mb-1">PromQL запрос</label>
      <textarea
        value={editingQuery}
        onChange={(e) => onQueryChange(e.target.value)}
        className="w-full px-4 py-3 bg-white border-2 border-blue-300 rounded-lg font-mono text-sm resize-none mb-4 shadow-sm focus:ring-2 focus:ring-blue-500"
        rows={4}
      />
      <div className="flex gap-3">
        <button
          onClick={onSave}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 active:bg-blue-800 shadow-md hover:shadow-lg transition-all"
        >
          ✓ Сохранить
        </button>
        <button
          onClick={onCancel}
          className="px-6 py-2.5 bg-gray-400 text-white rounded-lg text-sm font-semibold hover:bg-gray-500 active:bg-gray-600 shadow-md transition-all"
        >
          ✕ Отмена
        </button>
      </div>
    </div>
  );
};
