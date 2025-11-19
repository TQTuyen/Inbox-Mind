import { Button } from '@fe/shared/components/ui/button';
import { Input } from '@fe/shared/components/ui/input';
import { motion } from 'framer-motion';
import { RefreshCw, Search } from 'lucide-react';

interface ToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onRefresh: () => void;
}

export function Toolbar({
  searchQuery,
  onSearchChange,
  onRefresh,
}: ToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border bg-card px-4 py-3">
      {/* Search Bar */}
      <div className="flex-1 max-w-xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search mail..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 bg-accent/50"
            aria-label="Search emails"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            aria-label="Refresh"
            className="cursor-pointer"
          >
            <RefreshCw className="h-5 w-5" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
