import { Module } from '@nestjs/common';
import { SqsModule } from '@ssut/nestjs-sqs';
import { OrderProducerController } from './order-producer.controller';
import { OrderProducerService } from './order-producer.service';
import { buildOrderProducerQueueConfigs } from '@app/aws-clients';

@Module({
  imports: [
    SqsModule.registerAsync({
      useFactory: () => {
        const configs = buildOrderProducerQueueConfigs();
        return {
          producers: configs.map(({ name, queueUrl, region }) => ({
            name,
            queueUrl,
            region,
          })),
        };
      },
    }),
  ],
  controllers: [OrderProducerController],
  providers: [OrderProducerService],
})
export class OrderProducerModule {}
