import { Button } from '@fe/shared/components/ui/button';
import { Input } from '@fe/shared/components/ui/input';
import { Label } from '@fe/shared/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@fe/shared/components/ui/sheet';
import { Email, EmailAddress } from '@fe/types/email.types';
import { Loader2, Send, X } from 'lucide-react';
import { useState, useEffect } from 'react';

export type ComposeMode = 'compose' | 'reply' | 'replyAll' | 'forward';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: ComposeMode;
  originalEmail?: Email | null;
  onSend?: (data: ComposeData) => Promise<void>;
}

export interface ComposeData {
  to: string;
  cc: string;
  subject: string;
  body: string;
  inReplyTo?: string;
  threadId?: string;
}

const formatEmailAddresses = (addresses: EmailAddress[]): string => {
  return addresses.map((a) => (a.name ? `${a.name} <${a.email}>` : a.email)).join(', ');
};

const getReplySubject = (subject: string): string => {
  if (subject.toLowerCase().startsWith('re:')) {
    return subject;
  }
  return `Re: ${subject}`;
};

const getForwardSubject = (subject: string): string => {
  if (subject.toLowerCase().startsWith('fwd:')) {
    return subject;
  }
  return `Fwd: ${subject}`;
};

const getQuotedBody = (email: Email, mode: ComposeMode): string => {
  const timestamp = new Date(email.timestamp).toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const header =
    mode === 'forward'
      ? `---------- Forwarded message ---------\nFrom: ${email.from.name} <${email.from.email}>\nDate: ${timestamp}\nSubject: ${email.subject}\nTo: ${formatEmailAddresses(email.to)}\n\n`
      : `\n\nOn ${timestamp}, ${email.from.name} <${email.from.email}> wrote:\n> `;

  // Strip HTML tags for plain text quote
  const plainBody = email.body.replace(/<[^>]*>/g, '').trim();
  const quotedLines =
    mode === 'forward' ? plainBody : plainBody.split('\n').join('\n> ');

  return header + quotedLines;
};

export const ComposeModal = ({
  isOpen,
  onClose,
  mode,
  originalEmail,
  onSend,
}: ComposeModalProps) => {
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (isOpen && originalEmail) {
      switch (mode) {
        case 'reply':
          setTo(`${originalEmail.from.name} <${originalEmail.from.email}>`);
          setCc('');
          setSubject(getReplySubject(originalEmail.subject));
          setBody(getQuotedBody(originalEmail, mode));
          break;
        case 'replyAll': {
          setTo(`${originalEmail.from.name} <${originalEmail.from.email}>`);
          const ccAddresses = [
            ...originalEmail.to.filter((t) => t.email !== originalEmail.from.email),
            ...(originalEmail.cc || []),
          ];
          setCc(formatEmailAddresses(ccAddresses));
          setSubject(getReplySubject(originalEmail.subject));
          setBody(getQuotedBody(originalEmail, mode));
          break;
        }
        case 'forward':
          setTo('');
          setCc('');
          setSubject(getForwardSubject(originalEmail.subject));
          setBody(getQuotedBody(originalEmail, mode));
          break;
        default:
          setTo('');
          setCc('');
          setSubject('');
          setBody('');
      }
    } else if (isOpen && mode === 'compose') {
      setTo('');
      setCc('');
      setSubject('');
      setBody('');
    }
  }, [isOpen, mode, originalEmail]);

  const handleSend = async () => {
    if (!to.trim() || !subject.trim()) {
      alert('Please fill in the To and Subject fields');
      return;
    }

    setIsSending(true);
    try {
      if (onSend) {
        await onSend({
          to,
          cc,
          subject,
          body,
          inReplyTo: originalEmail?.id,
          threadId: originalEmail?.threadId,
        });
      }
      onClose();
    } catch (error) {
      console.error('Failed to send email:', error);
      alert('Failed to send email. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const getTitle = (): string => {
    switch (mode) {
      case 'reply':
        return 'Reply';
      case 'replyAll':
        return 'Reply All';
      case 'forward':
        return 'Forward';
      default:
        return 'New Message';
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="bottom"
        className="h-[85vh] sm:h-[80vh] flex flex-col p-0"
      >
        <SheetHeader className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-semibold">
              {getTitle()}
            </SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <SheetDescription className="sr-only">
            Compose and send an email
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="to" className="text-sm font-medium">
              To
            </Label>
            <Input
              id="to"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cc" className="text-sm font-medium">
              Cc
            </Label>
            <Input
              id="cc"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              placeholder="cc@example.com"
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject" className="text-sm font-medium">
              Subject
            </Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              className="w-full"
            />
          </div>

          <div className="space-y-2 flex-1">
            <Label htmlFor="body" className="text-sm font-medium">
              Message
            </Label>
            <textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message here..."
              className="w-full min-h-[300px] px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-gray-900 dark:text-white resize-none"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={isSending}>
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
