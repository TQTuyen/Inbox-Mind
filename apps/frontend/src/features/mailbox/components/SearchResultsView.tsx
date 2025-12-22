import { Badge } from '@fe/shared/components/ui/badge';
import { Button } from '@fe/shared/components/ui/button';
import { Card } from '@fe/shared/components/ui/card';
import { ScrollArea } from '@fe/shared/components/ui/scroll-area';
import { cn } from '@fe/lib/utils';
import { format } from 'date-fns';
import { ArrowLeft, Mail, Paperclip, Search } from 'lucide-react';
import { Email, useEmailStore } from '../store/emailStore';

interface SearchResultsViewProps {
  onEmailSelect: (email: Email) => void;
  onBack: () => void;
}

export function SearchResultsView({
  onEmailSelect,
  onBack,
}: SearchResultsViewProps) {
  const { searchResults, searchQuery } = useEmailStore();
  const results = searchResults;

  if (results.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <SearchHeader query={searchQuery} onBack={onBack} resultCount={0} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">
              No results found for "{searchQuery}"
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
        query={searchQuery}
        onBack={onBack}
        resultCount={results.length}
      />
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {results.map((email) => (
            <SearchResultCard
              key={email.id}
              email={email}
              onClick={() => onEmailSelect(email)}
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
  email,
  onClick,
}: {
  email: Email;
  onClick: () => void;
}) {
  return (
    <Card
      className={cn(
        'p-4 cursor-pointer hover:shadow-md transition-all',
        !email.isRead && 'bg-blue-50/50 dark:bg-blue-950/20'
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
                !email.isRead && 'font-semibold'
              )}
            >
              {email.from.name || email.from.email}
            </span>
            {!email.isRead && (
              <Mail className="h-3 w-3 text-blue-600 flex-shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {format(new Date(email.timestamp), 'MMM dd, yyyy')}
            </span>
          </div>
        </div>

        {/* Subject */}
        <div className="text-sm font-medium line-clamp-1">{email.subject}</div>

        {/* Preview/Snippet */}
        <p className="text-xs text-muted-foreground line-clamp-2">
          {email.preview}
        </p>

        {/* Footer: Attachments */}
        <div className="flex items-center gap-2 flex-wrap">
          {email.attachments && email.attachments.length > 0 && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0">
              <Paperclip className="h-3 w-3 mr-1" />
              {email.attachments.length}
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );
}
