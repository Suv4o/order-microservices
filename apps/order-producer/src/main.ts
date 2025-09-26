import { NestFactory } from '@nestjs/core';
import { OrderProducerModule } from './order-producer.module';

async function bootstrap() {
  const app = await NestFactory.create(OrderProducerModule);
  await app.listen(3001);
}
void bootstrap();
