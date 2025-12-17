import { Badge } from '@fe/shared/components/ui/badge';
import { Button } from '@fe/shared/components/ui/button';
import { Checkbox } from '@fe/shared/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@fe/shared/components/ui/popover';
import { Filter, X } from 'lucide-react';
import { useKanbanStore } from '../store/kanbanStore';
import { FILTER_OPTIONS, FilterOption } from '../types';

export function FilterControls() {
  const { activeFilters, toggleFilter, clearFilters } = useKanbanStore();

  const activeFilterCount = activeFilters.length;

  return (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-gray-100">
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0.5">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-gray-100" align="start">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100">Filter Emails</h4>
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-auto p-1 text-xs text-gray-700 dark:text-slate-300 hover:text-gray-900 dark:hover:text-gray-100"
                >
                  Clear all
                </Button>
              )}
            </div>
            <div className="space-y-3">
              {FILTER_OPTIONS.map((filter) => (
                <div key={filter.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={filter.id}
                    checked={activeFilters.includes(filter.id as FilterOption)}
                    onCheckedChange={() =>
                      toggleFilter(filter.id as FilterOption)
                    }
                  />
                  <label
                    htmlFor={filter.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer text-gray-700 dark:text-slate-300"
                  >
                    {filter.label}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Active filters badges */}
      {activeFilters.length > 0 && (
        <div className="flex items-center gap-2">
          {activeFilters.map((filterId) => {
            const filter = FILTER_OPTIONS.find((f) => f.id === filterId);
            if (!filter) return null;

            return (
              <Badge key={filterId} variant="secondary" className="gap-1 pr-1">
                {filter.label}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0.5 hover:bg-transparent"
                  onClick={() => toggleFilter(filterId as FilterOption)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
