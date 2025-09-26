import { Controller, Get } from '@nestjs/common';
import { OrderPersistenceService } from './order-persistence.service';

@Controller()
export class OrderPersistenceController {
  constructor(private readonly orderPersistenceService: OrderPersistenceService) {}

  @Get()
  getHello(): string {
    return this.orderPersistenceService.getHello();
  }
}
