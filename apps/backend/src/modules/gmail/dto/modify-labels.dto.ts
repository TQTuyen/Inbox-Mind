import { IsArray, IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { LabelAction } from '../../../common/enums';

export class ModifyLabelsDto {
  @ApiProperty({
    example: ['INBOX', 'IMPORTANT'],
    description: 'List of label IDs to modify',
  })
  @IsArray()
  @IsString({ each: true })
  labelIds: string[];

  @ApiProperty({
    enum: LabelAction,
    description: 'Action to perform on labels (add/remove)',
  })
  @IsEnum(LabelAction)
  action: LabelAction;
}
