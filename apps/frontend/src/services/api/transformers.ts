import { Email, EmailAddress, EmailAttachment, Mailbox } from './gmailApi';

/**
 * Transform Gmail API message to frontend Email format
 */
export function transformGmailMessage(message: any): Email {
  const headers = message.payload?.headers || [];

  const getHeader = (name: string): string => {
    const header = headers.find(
      (h: any) => h.name.toLowerCase() === name.toLowerCase()
    );
    return header?.value || '';
  };

  const parseEmailAddresses = (headerValue: string): EmailAddress[] => {
    if (!headerValue) return [];

    // Handle multiple addresses separated by comma
    const addresses = headerValue.split(',').map((addr) => addr.trim());

    return addresses.map((addr) => {
      // Parse "Name <email@example.com>" format
      const match = addr.match(/^(.+?)\s*<(.+?)>$/);
      if (match) {
        return {
          name: match[1].trim().replace(/^["']|["']$/g, ''),
          email: match[2].trim(),
        };
      }
      // Handle plain email address
      return {
        name: addr,
        email: addr,
      };
    });
  };

  const fromAddresses = parseEmailAddresses(getHeader('From'));
  const toAddresses = parseEmailAddresses(getHeader('To'));
  const ccAddresses = parseEmailAddresses(getHeader('Cc'));

  // Extract attachments
  const attachments = extractAttachments(message.payload);

  // Determine if email is read (doesn't have UNREAD label)
  const isRead = !message.labelIds?.includes('UNREAD');
  const isStarred = message.labelIds?.includes('STARRED');

  // Extract body
  const body = extractBody(message.payload);

  // Create preview from snippet or body
  const preview = message.snippet || body.substring(0, 150);

  return {
    id: message.id,
    threadId: message.threadId,
    from: fromAddresses[0] || { name: 'Unknown', email: 'unknown@example.com' },
    to: toAddresses,
    cc: ccAddresses.length > 0 ? ccAddresses : undefined,
    subject: getHeader('Subject') || '(No Subject)',
    preview: preview,
    body: body || message.snippet || '',
    timestamp: new Date(
      parseInt(message.internalDate || Date.now())
    ).toISOString(),
    isRead,
    isStarred,
    attachments: attachments.length > 0 ? attachments : undefined,
    labelIds: message.labelIds,
    snippet: message.snippet,
    internalDate: message.internalDate,
  };
}

/**
 * Extract attachments from Gmail message payload
 */
function extractAttachments(payload: any): EmailAttachment[] {
  const attachments: EmailAttachment[] = [];

  function traverseParts(part: any, partId = '') {
    if (!part) return;

    const currentPartId = partId || part.partId || '';

    // Check if this part is an attachment
    if (part.filename && part.body?.attachmentId) {
      attachments.push({
        id: part.body.attachmentId,
        name: part.filename,
        size: part.body.size || 0,
        type: part.mimeType || 'application/octet-stream',
        partId: currentPartId,
      });
    }

    // Check for inline attachments (Content-Disposition: inline)
    if (part.filename && !part.body?.attachmentId && part.body?.size > 0) {
      attachments.push({
        id: `inline-${currentPartId}`,
        name: part.filename,
        size: part.body.size || 0,
        type: part.mimeType || 'application/octet-stream',
        partId: currentPartId,
      });
    }

    // Recursively process nested parts
    if (part.parts) {
      part.parts.forEach((subPart: any, index: number) => {
        const subPartId = currentPartId
          ? `${currentPartId}.${index}`
          : `${index}`;
        traverseParts(subPart, subPartId);
      });
    }
  }

  traverseParts(payload);
  return attachments;
}

/**
 * Extract email body from Gmail message payload
 */
function extractBody(payload: any): string {
  if (!payload) return '';

  let htmlBody = '';
  let textBody = '';

  function traverseParts(part: any) {
    if (!part) return;

    const mimeType = part.mimeType;

    // Skip attachments
    if (part.filename && part.body?.attachmentId) {
      return;
    }

    // Extract body data
    if (part.body?.data) {
      const decodedBody = decodeBase64Url(part.body.data);

      if (mimeType === 'text/html') {
        htmlBody = decodedBody;
      } else if (mimeType === 'text/plain' && !htmlBody) {
        textBody = decodedBody;
      }
    }

    // Recursively process nested parts
    if (part.parts) {
      part.parts.forEach((subPart: any) => traverseParts(subPart));
    }
  }

  traverseParts(payload);

  // Prefer HTML body, fallback to plain text
  if (htmlBody) {
    return htmlBody;
  } else if (textBody) {
    // Convert plain text to HTML
    return `<p>${textBody.replace(/\n/g, '<br>')}</p>`;
  }

  return '';
}

/**
 * Decode base64url encoded string
 */
function decodeBase64Url(str: string): string {
  try {
    // Replace base64url characters with base64 characters
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/');

    // Decode base64
    const decoded = atob(base64);

    // Handle UTF-8 encoding
    return decodeURIComponent(escape(decoded));
  } catch (error) {
    console.error('Failed to decode base64url:', error);
    return str;
  }
}

/**
 * Transform Gmail label to frontend Mailbox format
 */
export function transformGmailLabel(label: any): Mailbox {
  return {
    id: label.id,
    name: label.name,
    type: label.type,
    messagesTotal: label.messagesTotal,
    messagesUnread: label.messagesUnread,
    threadsTotal: label.threadsTotal,
    threadsUnread: label.threadsUnread,
    unreadCount: label.messagesUnread || label.threadsUnread || 0,
  };
}

/**
 * Transform Gmail thread to frontend Thread format
 */
export function transformGmailThread(thread: any): any {
  return {
    id: thread.id,
    snippet: thread.snippet,
    historyId: thread.historyId,
    messages:
      thread.messages?.map((msg: any) => transformGmailMessage(msg)) || [],
  };
}

/**
 * Parse email address string into structured format
 */
export function parseEmailAddress(emailString: string): EmailAddress {
  const match = emailString.match(/^(.+?)\s*<(.+?)>$/);
  if (match) {
    return {
      name: match[1].trim().replace(/^["']|["']$/g, ''),
      email: match[2].trim(),
    };
  }
  return {
    name: emailString.trim(),
    email: emailString.trim(),
  };
}

/**
 * Format email address for display
 */
export function formatEmailAddress(address: EmailAddress): string {
  if (address.name && address.name !== address.email) {
    return `${address.name} <${address.email}>`;
  }
  return address.email;
}

/**
 * Calculate email list stats
 */
export function calculateEmailStats(emails: Email[]) {
  return {
    total: emails.length,
    unread: emails.filter((e) => !e.isRead).length,
    starred: emails.filter((e) => e.isStarred).length,
    withAttachments: emails.filter(
      (e) => e.attachments && e.attachments.length > 0
    ).length,
  };
}

/**
 * Group emails by date
 */
export function groupEmailsByDate(emails: Email[]): Record<string, Email[]> {
  const groups: Record<string, Email[]> = {};

  emails.forEach((email) => {
    const date = new Date(email.timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let key: string;

    if (isSameDay(date, today)) {
      key = 'Today';
    } else if (isSameDay(date, yesterday)) {
      key = 'Yesterday';
    } else if (isThisWeek(date)) {
      key = 'This Week';
    } else if (isThisMonth(date)) {
      key = 'This Month';
    } else {
      key = date.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      });
    }

    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(email);
  });

  return groups;
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function isThisWeek(date: Date): boolean {
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  weekStart.setHours(0, 0, 0, 0);

  return date >= weekStart && date <= today;
}

function isThisMonth(date: Date): boolean {
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth()
  );
}
