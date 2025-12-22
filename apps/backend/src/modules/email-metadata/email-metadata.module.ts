import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailMetadata } from './email-metadata.entity';
import { EmailMetadataService } from './email-metadata.service';
import { EmailMetadataController } from './email-metadata.controller';
import { EmailMetadataScheduler } from './email-metadata.scheduler';
import { AIModule } from '../ai/ai.module';

@Module({
  imports: [TypeOrmModule.forFeature([EmailMetadata]), AIModule],
  controllers: [EmailMetadataController],
  providers: [EmailMetadataService, EmailMetadataScheduler],
  exports: [EmailMetadataService],
})
export class EmailMetadataModule {}
