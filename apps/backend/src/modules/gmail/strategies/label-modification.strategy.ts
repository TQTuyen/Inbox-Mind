import { gmail_v1 } from 'googleapis';

export interface LabelModificationStrategy {
  execute(
    gmail: gmail_v1.Gmail,
    emailId: string,
    labelIds: string[]
  ): Promise<void>;
}
