import type { QueryCardProps } from './types';
import { QueryEditMode } from './QueryEditMode';
import { QueryViewMode } from './QueryViewMode';
import { QueryChart } from './QueryChart';

export const QueryCard = ({
  query,
  isEditing,
  editingName,
  editingQuery,
  onEdit,
  onSave,
  onCancel,
  onToggle,
  onDelete,
  onEditNameChange,
  onEditQueryChange,
  chartOptions
}: QueryCardProps) => {
  return (
    <div className="border-2 border-gray-300 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {isEditing ? (
        <QueryEditMode
          editingName={editingName}
          editingQuery={editingQuery}
          onNameChange={onEditNameChange}
          onQueryChange={onEditQueryChange}
          onSave={onSave}
          onCancel={onCancel}
        />
      ) : (
        <>
          <QueryViewMode
            query={query}
            onToggle={() => onToggle(query.id)}
            onEdit={() => onEdit(query)}
            onDelete={() => onDelete(query.id)}
          />
          <QueryChart query={query} chartOptions={chartOptions} />
        </>
      )}
    </div>
  );
};
