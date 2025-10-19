import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import type { OrderDto } from '@app/common-dto';
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
  async handleMessage(order: OrderDto): Promise<void> {
    await this.orderNotificationService.handleOrderNotification(order);
  }
}
export {};
