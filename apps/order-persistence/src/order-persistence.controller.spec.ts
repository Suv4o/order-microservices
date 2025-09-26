import { Test, TestingModule } from '@nestjs/testing';
import { OrderPersistenceController } from './order-persistence.controller';
import { OrderPersistenceService } from './order-persistence.service';

describe('OrderPersistenceController', () => {
  let orderPersistenceController: OrderPersistenceController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [OrderPersistenceController],
      providers: [OrderPersistenceService],
    }).compile();

    orderPersistenceController = app.get<OrderPersistenceController>(OrderPersistenceController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(orderPersistenceController.getHello()).toBe('Hello World!');
    });
  });
});
