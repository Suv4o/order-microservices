import { ConfigService } from '@nestjs/config';
import { buildSqsMicroserviceOptionsFromEnv } from '@suv4o/nestjs-sqs';

export interface OrderProducerQueueConfig {
  name: string;
  queueUrl: string;
  isFifo: boolean;
  region: string;
}

export const ORDER_PERSISTENCE_PRODUCER = 'orderPersistenceProducer';
export const ORDER_NOTIFICATION_PRODUCER = 'orderNotificationProducer';

const buildQueueUrlFromEnv = (
  configService: ConfigService,
  queueKey: string,
): string | undefined => {
  const queueName = configService.get<string>(`${queueKey}_NAME`);
  const endpoint = configService.get<string>('AWS_ENDPOINT_URL');
  const accountId = configService.get<string>('AWS_ACCOUNT_ID', '000000000000');

  if (!endpoint || !queueName) {
    return undefined;
  }

  return `${endpoint.replace(/\/$/, '')}/${accountId}/${queueName}`;
};

export const resolveQueueUrl = (
  configService: ConfigService,
  queueKey: string,
): string | undefined => {
  return (
    configService.get<string>(`${queueKey}_URL`) ??
    buildQueueUrlFromEnv(configService, queueKey)
  );
};

const resolveQueueUrlOrThrow = (
  configService: ConfigService,
  queueKey: string,
  serviceName: string,
): string => {
  const queueUrl = resolveQueueUrl(configService, queueKey);
  if (!queueUrl) {
    throw new Error(
      `${queueKey}_URL (or ${queueKey}_NAME when AWS_ENDPOINT_URL is set) env variable is required for ${serviceName}.`,
    );
  }

  return queueUrl;
};

export const getOrderPersistenceQueueUrl = (
  configService: ConfigService,
): string =>
  resolveQueueUrlOrThrow(
    configService,
    'ORDER_PERSISTENCE_QUEUE',
    'OrderPersistenceService',
  );

export const getOrderNotificationQueueUrl = (
  configService: ConfigService,
): string =>
  resolveQueueUrlOrThrow(
    configService,
    'ORDER_NOTIFICATION_QUEUE',
    'OrderNotificationService',
  );

export const buildOrderProducerQueueConfigs = (
  configService: ConfigService,
): OrderProducerQueueConfig[] => {
  const region = configService.get<string>('AWS_REGION', 'us-east-1');

  const definitions: Array<{
    queueKey: string;
    producerName: string;
  }> = [
    {
      queueKey: 'ORDER_PERSISTENCE_QUEUE',
      producerName: ORDER_PERSISTENCE_PRODUCER,
    },
  ];

  const hasNotificationQueue =
    Boolean(configService.get<string>('ORDER_NOTIFICATION_QUEUE_URL')) ||
    Boolean(configService.get<string>('ORDER_NOTIFICATION_QUEUE_NAME'));

  if (hasNotificationQueue) {
    definitions.push({
      queueKey: 'ORDER_NOTIFICATION_QUEUE',
      producerName: ORDER_NOTIFICATION_PRODUCER,
    });
  }

  const sqsOptions = buildSqsMicroserviceOptionsFromEnv(
    definitions.map(({ queueKey }) => ({
      pattern: { cmd: queueKey.toLowerCase() },
      queueKey,
    })),
  );

  return sqsOptions.queues.map((queue, index) => {
    const { producerName } = definitions[index];
    return {
      name: producerName,
      queueUrl: queue.queueUrl,
      isFifo: queue.queueUrl.endsWith('.fifo'),
      region,
    };
  });
};
