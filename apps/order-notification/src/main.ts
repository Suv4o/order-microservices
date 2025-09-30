import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { OrderNotificationModule } from './order-notification.module';
import {
  AwsClientsService,
  getOrderNotificationQueueConsumerOptions,
} from '@app/aws-clients';
import { SqsServer } from '@app/sqs-microservice';
import { ORDER_NOTIFICATION_PATTERN } from './order-notification.service';

async function bootstrap(): Promise<void> {
  const configService = new ConfigService();
  const {
    queue: { queueUrl, batchSize, waitTimeSeconds, visibilityTimeout },
    pollingIntervalMs,
  } = getOrderNotificationQueueConsumerOptions(configService);

  const awsClientsService = new AwsClientsService(configService);
  const sqsClient = awsClientsService.getSqsClient();

  const app = await NestFactory.createMicroservice(OrderNotificationModule, {
    strategy: new SqsServer(
      {
        queues: [
          {
            pattern: ORDER_NOTIFICATION_PATTERN,
            queueUrl,
            batchSize,
            waitTimeSeconds,
            visibilityTimeout,
          },
        ],
        pollingIntervalMs,
      },
      sqsClient,
    ),
  });

  await app.listen();
}

void bootstrap();
