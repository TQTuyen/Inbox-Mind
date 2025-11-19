import { cn } from '@fe/lib/utils';
import { motion } from 'framer-motion';

interface FilterChipsProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

const filters = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'important', label: 'Important' },
  { id: 'vip', label: 'From VIP' },
];

export function FilterChips({
  activeFilter,
  onFilterChange,
}: FilterChipsProps) {
  return (
    <div className="shrink-0 flex gap-2 overflow-x-auto border-b border-slate-800 px-4 py-2.5 bg-slate-900/50">
      {filters.map((filter) => (
        <motion.button
          key={filter.id}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onFilterChange(filter.id)}
          className={cn(
            'flex h-7 shrink-0 items-center justify-center gap-x-2 rounded-md px-3 text-sm font-medium transition-colors whitespace-nowrap cursor-pointer',
            activeFilter === filter.id
              ? ' bg-blue-600 hover:bg-blue-700 text-white font-medium'
              : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700 hover:text-white'
          )}
        >
          {filter.label}
        </motion.button>
      ))}
    </div>
  );
}
