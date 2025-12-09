export enum TokenType {
  ACCESS = 'access',
  REFRESH = 'refresh',
}

export enum GmailFormat {
  METADATA = 'metadata',
  FULL = 'full',
  MINIMAL = 'minimal',
  RAW = 'raw',
}

export enum GmailLabel {
  INBOX = 'INBOX',
  SENT = 'SENT',
  DRAFT = 'DRAFT',
  TRASH = 'TRASH',
  SPAM = 'SPAM',
  UNREAD = 'UNREAD',
  STARRED = 'STARRED',
  IMPORTANT = 'IMPORTANT',
}

export enum LabelAction {
  ADD = 'add',
  REMOVE = 'remove',
}

export enum NodeEnv {
  DEVELOPMENT = 'development',
  PRODUCTION = 'production',
  TEST = 'test',
}
