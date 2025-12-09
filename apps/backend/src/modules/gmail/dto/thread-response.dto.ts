import { ApiProperty } from '@nestjs/swagger';
import { gmail_v1 } from 'googleapis';

/**
 * Participant in a thread
 */
export class ThreadParticipantDto {
  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'Email address of the participant',
  })
  email: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'Display name of the participant',
    required: false,
  })
  name?: string;
}

/**
 * Message in a thread with essential details
 */
export class ThreadMessageDto {
  @ApiProperty({
    example: '18d1e2f3a4b5c6d7',
    description: 'Gmail message ID',
  })
  id: string;

  @ApiProperty({
    example: '18d1e2f3a4b5c6d7',
    description: 'Gmail thread ID',
  })
  threadId: string;

  @ApiProperty({
    example: ['INBOX', 'UNREAD'],
    description: 'Labels associated with the message',
  })
  labelIds: string[];

  @ApiProperty({
    example: 'This is a preview of the email content...',
    description: 'Snippet of the message content',
  })
  snippet: string;

  @ApiProperty({
    example: 1234567890000,
    description: 'Internal message creation timestamp (milliseconds)',
  })
  internalDate: number;

  @ApiProperty({
    type: Object,
    description: 'Full message payload from Gmail API',
  })
  payload: gmail_v1.Schema$MessagePart;

  @ApiProperty({
    example: 1638360000000,
    description: 'Estimated size in bytes',
  })
  sizeEstimate: number;

  @ApiProperty({
    type: ThreadParticipantDto,
    description: 'Sender of the message',
  })
  from: ThreadParticipantDto;

  @ApiProperty({
    type: [ThreadParticipantDto],
    description: 'Recipients of the message',
  })
  to: ThreadParticipantDto[];

  @ApiProperty({
    example: 'Re: Project Discussion',
    description: 'Subject of the message',
  })
  subject: string;

  @ApiProperty({
    example: 'Mon, 1 Dec 2023 10:00:00 +0000',
    description: 'Date header from the message',
  })
  date: string;

  @ApiProperty({
    example: '<message-id@mail.gmail.com>',
    description: 'Message-ID header',
    required: false,
  })
  messageId?: string;

  @ApiProperty({
    example: '<parent-message-id@mail.gmail.com>',
    description: 'In-Reply-To header',
    required: false,
  })
  inReplyTo?: string;

  @ApiProperty({
    example: '<msg1@mail.gmail.com> <msg2@mail.gmail.com>',
    description: 'References header',
    required: false,
  })
  references?: string;
}

/**
 * Complete thread response with all messages
 */
export class ThreadResponseDto {
  @ApiProperty({
    example: '18d1e2f3a4b5c6d7',
    description: 'Gmail thread ID',
  })
  threadId: string;

  @ApiProperty({
    type: [ThreadMessageDto],
    description:
      'All messages in the thread, sorted chronologically (oldest first)',
  })
  messages: ThreadMessageDto[];

  @ApiProperty({
    example: 5,
    description: 'Total number of messages in the thread',
  })
  messageCount: number;

  @ApiProperty({
    type: [ThreadParticipantDto],
    description: 'All unique participants in the thread',
  })
  participants: ThreadParticipantDto[];

  @ApiProperty({
    example: 'Project Discussion',
    description: 'Subject of the first message in the thread',
  })
  subject: string;

  @ApiProperty({
    example: 'This is a preview of the email content...',
    description: 'Snippet from the most recent message',
  })
  snippet: string;

  @ApiProperty({
    example: ['INBOX', 'UNREAD'],
    description: 'Labels from the most recent message',
  })
  labels: string[];

  @ApiProperty({
    example: 1234567890000,
    description: 'Timestamp of the first message in the thread (milliseconds)',
  })
  firstMessageDate: number;

  @ApiProperty({
    example: 1234567899999,
    description:
      'Timestamp of the most recent message in the thread (milliseconds)',
  })
  lastMessageDate: number;

  @ApiProperty({
    example: true,
    description: 'Whether the thread has unread messages',
  })
  hasUnread: boolean;

  @ApiProperty({
    example: false,
    description: 'Whether the thread has attachments',
  })
  hasAttachments: boolean;
}
