import { NestFactory } from '@nestjs/core';
import { OrderProducerModule } from './order-producer.module';

async function bootstrap() {
  const app = await NestFactory.create(OrderProducerModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
