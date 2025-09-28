import { Module } from '@nestjs/common';
import { SqsModule } from '@ssut/nestjs-sqs';
import {
  OrderNotificationService,
  ORDER_NOTIFICATION_CONSUMER_NAME,
} from './order-notification.service';
import { AwsClientsModule, resolveQueueUrl } from '@app/aws-clients';

@Module({
  imports: [
    AwsClientsModule,
    SqsModule.registerAsync({
      useFactory: () => {
        const queueUrl = resolveQueueUrl('ORDER_NOTIFICATION_QUEUE');
        if (!queueUrl) {
          throw new Error(
            'ORDER_NOTIFICATION_QUEUE_URL (or ORDER_NOTIFICATION_QUEUE_NAME when AWS_ENDPOINT_URL is set) env variable is required for OrderNotificationService.',
          );
        }

        return {
          consumers: [
            {
              name: ORDER_NOTIFICATION_CONSUMER_NAME,
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
  providers: [OrderNotificationService],
})
export class OrderNotificationModule {}
