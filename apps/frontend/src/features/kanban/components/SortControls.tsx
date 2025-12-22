import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@fe/shared/components/ui/select';
import { ArrowUpDown } from 'lucide-react';
import { useKanbanStore } from '../store/kanbanStore';
import { SORT_OPTIONS } from '../types';

export function SortControls() {
  const { sortBy, setSortBy } = useKanbanStore();

  return (
    <div className="flex items-center gap-2">
      <ArrowUpDown className="h-4 w-4 text-gray-500 dark:text-slate-400" />
      <Select value={sortBy} onValueChange={setSortBy}>
        <SelectTrigger className="w-[180px] bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-300">
          <SelectValue placeholder="Sort by..." />
        </SelectTrigger>
        <SelectContent className="bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700">
          {SORT_OPTIONS.map((option) => (
            <SelectItem
              key={option.id}
              value={option.id}
              className="text-gray-700 dark:text-slate-300"
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
