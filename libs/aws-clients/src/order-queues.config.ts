import { ConfigService } from '@nestjs/config';

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
