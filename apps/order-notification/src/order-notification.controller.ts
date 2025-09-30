import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import type { Message } from '@aws-sdk/client-sqs';
import {
  OrderNotificationService,
  ORDER_NOTIFICATION_PATTERN,
} from './order-notification.service';

@Controller()
export class OrderNotificationController {
  constructor(
    private readonly orderNotificationService: OrderNotificationService,
  ) {}

  @MessagePattern(ORDER_NOTIFICATION_PATTERN)
  async handleMessage(message: Message): Promise<void> {
    await this.orderNotificationService.handleOrderNotification(message);
  }
}
export {};
