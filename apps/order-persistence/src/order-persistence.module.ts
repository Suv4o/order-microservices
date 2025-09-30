import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AwsClientsModule } from '@app/aws-clients';
import { OrderPersistenceService } from './order-persistence.service';
import { OrderPersistenceController } from './order-persistence.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'].filter(Boolean),
      expandVariables: true,
    }),
    AwsClientsModule,
  ],
  controllers: [OrderPersistenceController],
  providers: [OrderPersistenceService],
})
export class OrderPersistenceModule {}
