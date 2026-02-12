import type { EmptyStateProps } from './types';

export const EmptyState = ({ count }: EmptyStateProps) => {
  if (count > 0) return null;

  return (
    <div className="text-center py-12 px-6 bg-linear-to-br from-gray-50 to-slate-100 rounded-xl border-2 border-dashed border-gray-300">
      <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
      <p className="text-lg font-bold text-gray-700 mb-2">Нет пользовательских запросов</p>
      <p className="text-sm text-gray-600 mb-4">Добавьте PromQL запрос выше для начала работы</p>
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-semibold">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
        Создайте первый запрос
      </div>
    </div>
  );
};
