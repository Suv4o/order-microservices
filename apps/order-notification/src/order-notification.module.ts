import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AwsClientsModule } from '@app/aws-clients';
import { OrderNotificationService } from './order-notification.service';
import { OrderNotificationController } from './order-notification.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'].filter(Boolean),
      expandVariables: true,
    }),
    AwsClientsModule,
  ],
  controllers: [OrderNotificationController],
  providers: [OrderNotificationService],
})
export class OrderNotificationModule {}
