import { Module } from '@nestjs/common';
import { OrderProducerController } from './order-producer.controller';
import { OrderProducerService } from './order-producer.service';

@Module({
  imports: [],
  controllers: [OrderProducerController],
  providers: [OrderProducerService],
})
export class OrderProducerModule {}
