import { NestFactory } from '@nestjs/core';
import { OrderNotificationModule } from './order-notification.module';

async function bootstrap() {
  const app = await NestFactory.create(OrderNotificationModule);
  await app.init();
}
void bootstrap();
