import { Test, TestingModule } from '@nestjs/testing';
import { OrderProducerController } from './order-producer.controller';
import { OrderProducerService } from './order-producer.service';

describe('OrderProducerController', () => {
  let orderProducerController: OrderProducerController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [OrderProducerController],
      providers: [OrderProducerService],
    }).compile();

    orderProducerController = app.get<OrderProducerController>(OrderProducerController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(orderProducerController.getHello()).toBe('Hello World!');
    });
  });
});
