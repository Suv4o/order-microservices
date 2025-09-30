import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { OrderPersistenceModule } from './order-persistence.module';
import {
  AwsClientsService,
  getOrderPersistenceQueueConsumerOptions,
} from '@app/aws-clients';
import { SqsServer } from '@app/sqs-microservice';
import { ORDER_PERSISTENCE_PATTERN } from './order-persistence.service';

async function bootstrap(): Promise<void> {
  const configService = new ConfigService();
  const {
    queue: { queueUrl, batchSize, waitTimeSeconds, visibilityTimeout },
    pollingIntervalMs,
  } = getOrderPersistenceQueueConsumerOptions(configService);

  const awsClientsService = new AwsClientsService(configService);
  const sqsClient = awsClientsService.getSqsClient();

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
        pollingIntervalMs,
      },
      sqsClient,
    ),
  });

  await app.listen();
}

void bootstrap();
