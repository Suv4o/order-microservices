import { Test, TestingModule } from '@nestjs/testing';
import { OrderNotificationController } from './order-notification.controller';
import { OrderNotificationService } from './order-notification.service';

describe('OrderNotificationController', () => {
  let orderNotificationController: OrderNotificationController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [OrderNotificationController],
      providers: [OrderNotificationService],
    }).compile();

    orderNotificationController = app.get<OrderNotificationController>(OrderNotificationController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(orderNotificationController.getHello()).toBe('Hello World!');
    });
  });
});
