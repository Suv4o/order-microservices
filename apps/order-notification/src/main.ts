import { NestFactory } from '@nestjs/core';
import { OrderNotificationModule } from './order-notification.module';

async function bootstrap() {
  const app = await NestFactory.create(OrderNotificationModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
