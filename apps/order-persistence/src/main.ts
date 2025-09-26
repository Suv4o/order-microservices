import { NestFactory } from '@nestjs/core';
import { OrderPersistenceModule } from './order-persistence.module';

async function bootstrap() {
  const app = await NestFactory.create(OrderPersistenceModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
