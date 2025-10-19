import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { OrderNotificationModule } from './order-notification.module';
import { AwsClientsService } from '@app/aws-clients';
import { getSqsPollingSettings } from '@app/common-utils';
import {
  SqsServer,
  buildSqsMicroserviceOptionsFromEnv,
} from '@suv4o/nestjs-sqs';
import { ORDER_NOTIFICATION_PATTERN } from './order-notification.service';

async function bootstrap(): Promise<void> {
  const configService = new ConfigService();
  const pollingSettings = getSqsPollingSettings(configService);
  const awsClientsService = new AwsClientsService(configService);
  const sqsClient = awsClientsService.getSqsClient();

  const sqsOptions = buildSqsMicroserviceOptionsFromEnv(
    [
      {
        pattern: ORDER_NOTIFICATION_PATTERN,
        queueKey: 'ORDER_NOTIFICATION_QUEUE',
        defaults: {
          batchSize: pollingSettings.batchSize,
          waitTimeSeconds: pollingSettings.waitTimeSeconds,
          visibilityTimeout: pollingSettings.visibilityTimeout,
        },
      },
    ],
    {
      defaults: {
        pollingIntervalMs: pollingSettings.errorBackoffMs,
      },
    },
  );

  const app = await NestFactory.createMicroservice(OrderNotificationModule, {
    strategy: new SqsServer(sqsOptions, sqsClient),
  });

  await app.listen();
}

void bootstrap();
