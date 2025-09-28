import { Module } from '@nestjs/common';
import { SqsModule } from '@ssut/nestjs-sqs';
import {
  OrderPersistenceService,
  ORDER_PERSISTENCE_CONSUMER_NAME,
} from './order-persistence.service';
import { AwsClientsModule, resolveQueueUrl } from '@app/aws-clients';

@Module({
  imports: [
    AwsClientsModule,
    SqsModule.registerAsync({
      useFactory: () => {
        const queueUrl = resolveQueueUrl('ORDER_PERSISTENCE_QUEUE');
        if (!queueUrl) {
          throw new Error(
            'ORDER_PERSISTENCE_QUEUE_URL (or ORDER_PERSISTENCE_QUEUE_NAME when AWS_ENDPOINT_URL is set) env variable is required for OrderPersistenceService.',
          );
        }

        return {
          consumers: [
            {
              name: ORDER_PERSISTENCE_CONSUMER_NAME,
              queueUrl,
              region: process.env.AWS_REGION ?? 'us-east-1',
              batchSize: Number(process.env.SQS_MAX_MESSAGES ?? 5),
              waitTimeSeconds: Number(process.env.SQS_WAIT_TIME_SECONDS ?? 20),
              visibilityTimeout: Number(
                process.env.SQS_VISIBILITY_TIMEOUT ?? 60,
              ),
            },
          ],
        };
      },
    }),
  ],
  controllers: [],
  providers: [OrderPersistenceService],
})
export class OrderPersistenceModule {}
