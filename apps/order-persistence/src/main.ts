import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { OrderPersistenceModule } from './order-persistence.module';
import { AwsClientsService, resolveQueueUrl } from '@app/aws-clients';
import { SqsServer } from '@app/sqs-microservice';
import { getNumericConfigValue } from '@app/common-utils';
import { ORDER_PERSISTENCE_PATTERN } from './order-persistence.service';

async function bootstrap(): Promise<void> {
  const configService = new ConfigService();
  const queueUrl = resolveQueueUrl(configService, 'ORDER_PERSISTENCE_QUEUE');
  if (!queueUrl) {
    throw new Error(
      'ORDER_PERSISTENCE_QUEUE_URL (or ORDER_PERSISTENCE_QUEUE_NAME when AWS_ENDPOINT_URL is set) env variable is required for OrderPersistenceService.',
    );
  }

  const awsClientsService = new AwsClientsService(configService);
  const sqsClient = awsClientsService.getSqsClient();

  const batchSize = getNumericConfigValue(configService, 'SQS_MAX_MESSAGES', 5);
  const waitTimeSeconds = getNumericConfigValue(
    configService,
    'SQS_WAIT_TIME_SECONDS',
  );
  const visibilityTimeout = getNumericConfigValue(
    configService,
    'SQS_VISIBILITY_TIMEOUT',
  );
  const errorBackoffMs = getNumericConfigValue(
    configService,
    'SQS_ERROR_BACKOFF_MS',
  );

  const app = await NestFactory.createMicroservice(OrderPersistenceModule, {
    strategy: new SqsServer(
      {
        queues: [
          {
            pattern: ORDER_PERSISTENCE_PATTERN,
            queueUrl,
            batchSize,
            waitTimeSeconds,
            visibilityTimeout,
          },
        ],
        pollingIntervalMs: errorBackoffMs,
      },
      sqsClient,
    ),
  });

  await app.listen();
}

void bootstrap();
