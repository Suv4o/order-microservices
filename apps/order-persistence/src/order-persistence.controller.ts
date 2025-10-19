import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import type { OrderDto } from '@app/common-dto';
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
  async handleMessage(order: OrderDto): Promise<void> {
    await this.orderPersistenceService.handleOrderMessage(order);
  }
}
