import { Button } from '@fe/shared/components/ui/button';
import { Input } from '@fe/shared/components/ui/input';
import { Loader2, Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useEmailStore } from '../store/emailStore';

interface SearchBarProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
}

export function SearchBar({ onSearch, isLoading = false }: SearchBarProps) {
  const { searchQuery, isSearchMode, clearSearch } = useEmailStore();
  const [localQuery, setLocalQuery] = useState(searchQuery);

  // Sync with store
  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (localQuery.trim().length >= 2) {
      onSearch(localQuery.trim());
    }
  };

  const handleClear = () => {
    setLocalQuery('');
    clearSearch();
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 w-full">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search emails... (e.g., marketing, Nguyen)"
          value={localQuery}
          onChange={(e) => setLocalQuery(e.target.value)}
          className="pl-10 pr-10"
          disabled={isLoading}
        />
        {(localQuery || isSearchMode) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
            onClick={handleClear}
            disabled={isLoading}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      <Button type="submit" disabled={isLoading || localQuery.trim().length < 2}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Searching...
          </>
        ) : (
          <>
            <Search className="mr-2 h-4 w-4" />
            Search
          </>
        )}
      </Button>
    </form>
  );
}
