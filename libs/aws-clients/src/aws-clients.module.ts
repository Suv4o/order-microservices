import { Module } from '@nestjs/common';
import { AwsClientsService } from './aws-clients.service';

@Module({
  providers: [AwsClientsService],
  exports: [AwsClientsService],
})
export class AwsClientsModule {}
