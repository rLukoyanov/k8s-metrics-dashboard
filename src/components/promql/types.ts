// Types for Custom PromQL Charts
export interface CustomQuery {
  id: number;
  name: string;
  query: string;
  active: boolean;
  data?: {
    labels: string[];
    datasets: any[];
  };
  loading?: boolean;
  error?: string;
}

export interface QueryFormProps {
  newQueryName: string;
  newQuery: string;
  onQueryNameChange: (name: string) => void;
  onQueryChange: (query: string) => void;
  onSubmit: () => void;
}

export interface QueryCardProps {
  query: CustomQuery;
  isEditing: boolean;
  editingName: string;
  editingQuery: string;
  onEdit: (query: CustomQuery) => void;
  onSave: () => void;
  onCancel: () => void;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
  onEditNameChange: (name: string) => void;
  onEditQueryChange: (query: string) => void;
  chartOptions: any;
}

export interface EmptyStateProps {
  count: number;
}
