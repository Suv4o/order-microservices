import { ConfigService } from '@nestjs/config';
import { getSqsPollingSettings } from '@app/common-utils';

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

export interface OrderQueueConsumerOptions {
  queue: {
    queueUrl: string;
    batchSize: number;
    waitTimeSeconds: number;
    visibilityTimeout: number;
  };
  pollingIntervalMs: number;
}

const buildOrderQueueConsumerOptions = (
  configService: ConfigService,
  queueKey: string,
  serviceName: string,
): OrderQueueConsumerOptions => {
  const queueUrl = resolveQueueUrlOrThrow(configService, queueKey, serviceName);
  const { batchSize, waitTimeSeconds, visibilityTimeout, errorBackoffMs } =
    getSqsPollingSettings(configService);

  return {
    queue: {
      queueUrl,
      batchSize,
      waitTimeSeconds,
      visibilityTimeout,
    },
    pollingIntervalMs: errorBackoffMs,
  };
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

export const getOrderPersistenceQueueConsumerOptions = (
  configService: ConfigService,
): OrderQueueConsumerOptions =>
  buildOrderQueueConsumerOptions(
    configService,
    'ORDER_PERSISTENCE_QUEUE',
    'OrderPersistenceService',
  );

export const getOrderNotificationQueueConsumerOptions = (
  configService: ConfigService,
): OrderQueueConsumerOptions =>
  buildOrderQueueConsumerOptions(
    configService,
    'ORDER_NOTIFICATION_QUEUE',
    'OrderNotificationService',
  );

export const buildOrderProducerQueueConfigs = (
  configService: ConfigService,
): OrderProducerQueueConfig[] => {
  const region = configService.get<string>('AWS_REGION', 'us-east-1');
  const persistenceQueueUrl = resolveQueueUrl(
    configService,
    'ORDER_PERSISTENCE_QUEUE',
  );
  if (!persistenceQueueUrl) {
    throw new Error(
      'ORDER_PERSISTENCE_QUEUE_URL env variable is required for order queue configuration.',
    );
  }

  const configs: OrderProducerQueueConfig[] = [
    {
      name: ORDER_PERSISTENCE_PRODUCER,
      queueUrl: persistenceQueueUrl,
      isFifo: persistenceQueueUrl.endsWith('.fifo'),
      region,
    },
  ];

  const notificationQueueUrl = resolveQueueUrl(
    configService,
    'ORDER_NOTIFICATION_QUEUE',
  );
  if (notificationQueueUrl) {
    configs.push({
      name: ORDER_NOTIFICATION_PRODUCER,
      queueUrl: notificationQueueUrl,
      isFifo: notificationQueueUrl.endsWith('.fifo'),
      region,
    });
  }

  return configs;
};
