import { Module } from '@nestjs/common';
import { OrderNotificationController } from './order-notification.controller';
import { OrderNotificationService } from './order-notification.service';

@Module({
  imports: [],
  controllers: [OrderNotificationController],
  providers: [OrderNotificationService],
})
export class OrderNotificationModule {}
