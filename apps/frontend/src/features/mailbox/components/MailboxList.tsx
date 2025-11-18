import { useEmailStore } from '@fe/features/mailbox/store/emailStore';
import {
  Inbox,
  Star,
  Send,
  FileEdit,
  Archive,
  Trash,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@fe/lib/utils';

interface MailboxListProps {
  isMobile?: boolean;
}

export const MailboxList = ({ isMobile = false }: MailboxListProps) => {
  const { mailboxes, selectedMailboxId, setSelectedMailbox } = useEmailStore();

  // Ensure mailboxes is always an array
  const safeMailboxes = Array.isArray(mailboxes) ? mailboxes : [];

  const getMailboxIcon = (name: string) => {
    const iconClass = 'w-5 h-5';

    switch (name.toLowerCase()) {
      case 'inbox':
        return <Inbox className={iconClass} />;
      case 'starred':
        return <Star className={iconClass} />;
      case 'sent':
        return <Send className={iconClass} />;
      case 'drafts':
        return <FileEdit className={iconClass} />;
      case 'archive':
        return <Archive className={iconClass} />;
      case 'trash':
        return <Trash className={iconClass} />;
      case 'spam':
        return <AlertTriangle className={iconClass} />;
      default:
        return <Inbox className={iconClass} />;
    }
  };

  return (
    <nav
      className={cn(
        'bg-card border-r overflow-y-auto',
        isMobile ? 'w-full' : 'w-64'
      )}
      aria-label="Mailbox navigation"
    >
      <div className="p-4">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Mailboxes
        </h2>
        <ul className="space-y-1">
          {safeMailboxes.length > 0 ? (
            safeMailboxes.map((mailbox) => (
              <li key={mailbox.id}>
                <button
                  onClick={() => setSelectedMailbox(mailbox.id)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    selectedMailboxId === mailbox.id
                      ? 'bg-primary/10 text-primary'
                      : 'text-foreground hover:bg-accent'
                  )}
                  aria-label={`${mailbox.name} mailbox, ${mailbox.unreadCount} unread`}
                  aria-current={
                    selectedMailboxId === mailbox.id ? 'page' : undefined
                  }
                >
                  <span className="flex items-center space-x-3">
                    {getMailboxIcon(mailbox.name)}
                    <span>{mailbox.name}</span>
                  </span>
                  {mailbox.unreadCount > 0 && (
                    <span
                      className="bg-primary text-primary-foreground text-xs font-semibold px-2 py-0.5 rounded-full"
                      aria-label={`${mailbox.unreadCount} unread emails`}
                    >
                      {mailbox.unreadCount}
                    </span>
                  )}
                </button>
              </li>
            ))
          ) : (
            <li className="text-sm text-muted-foreground p-3">
              Loading mailboxes...
            </li>
          )}
        </ul>
      </div>
    </nav>
  );
};
