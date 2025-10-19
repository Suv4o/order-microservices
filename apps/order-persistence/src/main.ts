import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { OrderPersistenceModule } from './order-persistence.module';
import { AwsClientsService } from '@app/aws-clients';
import { getSqsPollingSettings } from '@app/common-utils';
import {
  SqsServer,
  buildSqsMicroserviceOptionsFromEnv,
} from '@suv4o/nestjs-sqs';
import { ORDER_PERSISTENCE_PATTERN } from './order-persistence.service';

async function bootstrap(): Promise<void> {
  const configService = new ConfigService();
  const pollingSettings = getSqsPollingSettings(configService);
  const awsClientsService = new AwsClientsService(configService);
  const sqsClient = awsClientsService.getSqsClient();

  const sqsOptions = buildSqsMicroserviceOptionsFromEnv(
    [
      {
        pattern: ORDER_PERSISTENCE_PATTERN,
        queueKey: 'ORDER_PERSISTENCE_QUEUE',
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

  const app = await NestFactory.createMicroservice(OrderPersistenceModule, {
    strategy: new SqsServer(sqsOptions, sqsClient),
  });

  await app.listen();
}

void bootstrap();
