import { FuzzySearchResult } from '@fe/services/api/gmailApi';
import { Badge } from '@fe/shared/components/ui/badge';
import { Button } from '@fe/shared/components/ui/button';
import { Card } from '@fe/shared/components/ui/card';
import { ScrollArea } from '@fe/shared/components/ui/scroll-area';
import { cn } from '@fe/lib/utils';
import { format } from 'date-fns';
import { ArrowLeft, Mail, Paperclip, Search } from 'lucide-react';
import { Email } from '../store/emailStore';

interface SearchResultsViewProps {
  results: FuzzySearchResult[];
  query: string;
  isLoading: boolean;
  error: Error | null;
  onEmailClick: (result: FuzzySearchResult) => void;
  onBack: () => void;
}

export function SearchResultsView({
  results,
  query,
  isLoading,
  error,
  onEmailClick,
  onBack,
}: SearchResultsViewProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <SearchHeader query={query} onBack={onBack} resultCount={0} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-pulse" />
            <p className="text-sm text-muted-foreground">Searching...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full">
        <SearchHeader query={query} onBack={onBack} resultCount={0} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-sm text-destructive">
              Error: {error.message || 'Failed to search emails'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <SearchHeader query={query} onBack={onBack} resultCount={0} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">
              No results found for "{query}"
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Try a different search term
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <SearchHeader
        query={query}
        onBack={onBack}
        resultCount={results.length}
      />
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {results.map((result) => (
            <SearchResultCard
              key={result.id}
              result={result}
              onClick={() => onEmailClick(result)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function SearchHeader({
  query,
  onBack,
  resultCount,
}: {
  query: string;
  onBack: () => void;
  resultCount: number;
}) {
  return (
    <div className="p-4 border-b bg-background">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex-1">
          <h2 className="text-lg font-semibold">Search Results</h2>
          <p className="text-sm text-muted-foreground">
            Found {resultCount} result{resultCount !== 1 ? 's' : ''} for "
            {query}"
          </p>
        </div>
      </div>
    </div>
  );
}

function SearchResultCard({
  result,
  onClick,
}: {
  result: FuzzySearchResult;
  onClick: () => void;
}) {
  return (
    <Card
      className={cn(
        'p-4 cursor-pointer hover:shadow-md transition-all',
        !result.isRead && 'bg-blue-50/50 dark:bg-blue-950/20'
      )}
      onClick={onClick}
    >
      <div className="space-y-2">
        {/* Header: Sender and Time */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span
              className={cn(
                'text-sm font-medium truncate',
                !result.isRead && 'font-semibold'
              )}
            >
              {result.from.name || result.from.email}
            </span>
            {!result.isRead && (
              <Mail className="h-3 w-3 text-blue-600 flex-shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge variant="secondary" className="text-xs">
              {Math.round(result.score * 100)}% match
            </Badge>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {format(new Date(result.timestamp), 'MMM dd, yyyy')}
            </span>
          </div>
        </div>

        {/* Subject */}
        <div className="text-sm font-medium line-clamp-1">{result.subject}</div>

        {/* Snippet */}
        <p className="text-xs text-muted-foreground line-clamp-2">
          {result.snippet}
        </p>

        {/* Footer: Matched Fields and Attachments */}
        <div className="flex items-center gap-2 flex-wrap">
          {result.matchedFields.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">Matched:</span>
              {result.matchedFields.map((field) => (
                <Badge
                  key={field}
                  variant="outline"
                  className="text-xs px-1.5 py-0"
                >
                  {field}
                </Badge>
              ))}
            </div>
          )}
          {result.hasAttachments && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0">
              <Paperclip className="h-3 w-3" />
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );
}
