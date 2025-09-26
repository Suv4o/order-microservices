import { Controller, Get } from '@nestjs/common';
import { OrderProducerService } from './order-producer.service';

@Controller()
export class OrderProducerController {
  constructor(private readonly orderProducerService: OrderProducerService) {}

  @Get()
  getHello(): string {
    return this.orderProducerService.getHello();
  }
}
