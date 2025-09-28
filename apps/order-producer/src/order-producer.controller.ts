import { Body, Controller, Post } from '@nestjs/common';
import { OrderProducerService } from './order-producer.service';
import { ensureOrderMessage } from '@app/common-dto';
import type { OrderDto } from '@app/common-dto';

@Controller('orders')
export class OrderProducerController {
  constructor(private readonly orderProducerService: OrderProducerService) {}

  @Post()
  async createOrder(
    @Body() order: OrderDto,
  ): Promise<{ status: 'accepted'; orderId: string }> {
    const normalized = ensureOrderMessage(order);
    await this.orderProducerService.publishOrder(normalized);
    return {
      status: 'accepted',
      orderId: normalized.orderId,
    };
  }
}
