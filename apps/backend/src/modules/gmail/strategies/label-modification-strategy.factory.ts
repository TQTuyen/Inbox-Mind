import { Injectable } from '@nestjs/common';
import { LabelAction } from '../../../common/enums';
import { LabelModificationStrategy } from './label-modification.strategy';
import { AddLabelsStrategy } from './add-labels.strategy';
import { RemoveLabelsStrategy } from './remove-labels.strategy';

@Injectable()
export class LabelModificationStrategyFactory {
  constructor(
    private readonly addLabelsStrategy: AddLabelsStrategy,
    private readonly removeLabelsStrategy: RemoveLabelsStrategy
  ) {}

  getStrategy(action: LabelAction): LabelModificationStrategy {
    switch (action) {
      case LabelAction.ADD:
        return this.addLabelsStrategy;
      case LabelAction.REMOVE:
        return this.removeLabelsStrategy;
      default:
        throw new Error(`Unknown label action: ${action}`);
    }
  }
}
