import { Button } from '@fe/shared/components/ui/button';
import { Input } from '@fe/shared/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@fe/shared/components/ui/popover';
import { Clock, Hash, Loader2, Search, Sparkles, User, X } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { useEmailStore } from '../store/emailStore';
import {
  useSearchSuggestions,
  useSaveSearchHistory,
} from '@fe/hooks/useSearchSuggestions';
import type { SuggestionType } from '@fe/services/api/gmailApi';

interface SearchBarProps {
  onSearch: (query: string, isSemanticSearch?: boolean) => void;
  isLoading?: boolean;
}

// Icon mapping for suggestion types
const getSuggestionIcon = (type: SuggestionType) => {
  switch (type) {
    case 'contact':
      return User;
    case 'keyword':
      return Hash;
    case 'semantic':
      return Sparkles;
    case 'history':
      return Clock;
    default:
      return Search;
  }
};

export function SearchBar({ onSearch, isLoading = false }: SearchBarProps) {
  const { searchQuery, isSearchMode, clearSearch } = useEmailStore();
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch suggestions (only when query >= 2 chars)
  const { data: suggestionsData, isLoading: isSuggestionsLoading } =
    useSearchSuggestions(localQuery, isPopoverOpen);
  const saveHistoryMutation = useSaveSearchHistory();

  const suggestions = suggestionsData?.suggestions || [];

  // Sync with store
  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  // Open popover when suggestions are available
  useEffect(() => {
    if (localQuery.length >= 2 && suggestions.length > 0) {
      setIsPopoverOpen(true);
      setSelectedIndex(-1);
    } else {
      setIsPopoverOpen(false);
    }
  }, [localQuery, suggestions.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedQuery = localQuery.trim();

    if (trimmedQuery.length >= 2) {
      // Check if selected suggestion is semantic type
      const isSemanticSearch =
        selectedIndex >= 0 && suggestions[selectedIndex]?.type === 'semantic';

      // Save to search history
      saveHistoryMutation.mutate(trimmedQuery);

      // Execute search
      onSearch(trimmedQuery, isSemanticSearch);

      // Close popover
      setIsPopoverOpen(false);
      setSelectedIndex(-1);
    }
  };

  const handleSuggestionClick = (
    suggestionText: string,
    type: SuggestionType
  ) => {
    setLocalQuery(suggestionText);
    setIsPopoverOpen(false);
    setSelectedIndex(-1);

    // Save to history and execute search
    saveHistoryMutation.mutate(suggestionText);
    onSearch(suggestionText, type === 'semantic');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isPopoverOpen || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;

      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;

      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          const suggestion = suggestions[selectedIndex];
          handleSuggestionClick(suggestion.text, suggestion.type);
        } else {
          handleSubmit(e);
        }
        break;

      case 'Escape':
        e.preventDefault();
        setIsPopoverOpen(false);
        setSelectedIndex(-1);
        break;

      default:
        break;
    }
  };

  const handleClear = () => {
    setLocalQuery('');
    clearSearch();
    setIsPopoverOpen(false);
    setSelectedIndex(-1);
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 w-full">
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Search emails... (e.g., marketing, Nguyen)"
              value={localQuery}
              onChange={(e) => setLocalQuery(e.target.value)}
              onKeyDown={handleKeyDown}
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
        </PopoverTrigger>

        <PopoverContent
          align="start"
          className="w-[var(--radix-popover-trigger-width)] p-0"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="max-h-[300px] overflow-y-auto">
            {isSuggestionsLoading ? (
              <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Loading suggestions...
              </div>
            ) : suggestions.length === 0 ? (
              <div className="py-4 px-3 text-sm text-muted-foreground text-center">
                No suggestions found
              </div>
            ) : (
              <div className="py-1">
                {suggestions.map((suggestion, index) => {
                  const Icon = getSuggestionIcon(suggestion.type);
                  const isSelected = index === selectedIndex;

                  return (
                    <button
                      key={`${suggestion.type}-${suggestion.text}-${index}`}
                      type="button"
                      className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors ${
                        isSelected
                          ? 'bg-accent text-accent-foreground'
                          : 'hover:bg-accent/50'
                      }`}
                      onClick={() =>
                        handleSuggestionClick(suggestion.text, suggestion.type)
                      }
                      onMouseEnter={() => setSelectedIndex(index)}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      <span className="flex-1 truncate">{suggestion.text}</span>
                      <span className="text-xs text-muted-foreground capitalize">
                        {suggestion.type}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <Button
        type="submit"
        disabled={isLoading || localQuery.trim().length < 2}
      >
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
