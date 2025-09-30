import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import type { Message } from '@aws-sdk/client-sqs';
import {
  OrderPersistenceService,
  ORDER_PERSISTENCE_PATTERN,
} from './order-persistence.service';

@Controller()
export class OrderPersistenceController {
  constructor(
    private readonly orderPersistenceService: OrderPersistenceService,
  ) {}

  @MessagePattern(ORDER_PERSISTENCE_PATTERN)
  async handleMessage(message: Message): Promise<void> {
    await this.orderPersistenceService.handleOrderMessage(message);
  }
}
