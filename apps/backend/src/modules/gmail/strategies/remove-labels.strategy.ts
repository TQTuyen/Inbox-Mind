import { Injectable } from '@nestjs/common';
import { gmail_v1 } from 'googleapis';
import { LabelModificationStrategy } from './label-modification.strategy';
import { GMAIL_CONFIG } from '../../../common/constants/gmail.constants';

@Injectable()
export class RemoveLabelsStrategy implements LabelModificationStrategy {
  async execute(
    gmail: gmail_v1.Gmail,
    emailId: string,
    labelIds: string[]
  ): Promise<void> {
    await gmail.users.messages.modify({
      userId: GMAIL_CONFIG.USER_ID,
      id: emailId,
      requestBody: {
        addLabelIds: [],
        removeLabelIds: labelIds,
      },
    });
  }
}
