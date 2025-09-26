import { Module } from '@nestjs/common';
import { OrderPersistenceController } from './order-persistence.controller';
import { OrderPersistenceService } from './order-persistence.service';

@Module({
  imports: [],
  controllers: [OrderPersistenceController],
  providers: [OrderPersistenceService],
})
export class OrderPersistenceModule {}
