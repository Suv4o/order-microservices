import { Controller, Get } from '@nestjs/common';
import { OrderNotificationService } from './order-notification.service';

@Controller()
export class OrderNotificationController {
  constructor(private readonly orderNotificationService: OrderNotificationService) {}

  @Get()
  getHello(): string {
    return this.orderNotificationService.getHello();
  }
}
