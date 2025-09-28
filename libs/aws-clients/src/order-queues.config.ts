export interface OrderProducerQueueConfig {
  name: string;
  queueUrl: string;
  isFifo: boolean;
  region: string;
}

export const ORDER_PERSISTENCE_PRODUCER = 'orderPersistenceProducer';
export const ORDER_NOTIFICATION_PRODUCER = 'orderNotificationProducer';

const buildQueueUrlFromEnv = (queueKey: string): string | undefined => {
  const queueName = process.env[`${queueKey}_NAME`];
  const endpoint = process.env.AWS_ENDPOINT_URL;
  const accountId = process.env.AWS_ACCOUNT_ID ?? '000000000000';

  if (!endpoint || !queueName) {
    return undefined;
  }

  return `${endpoint.replace(/\/$/, '')}/${accountId}/${queueName}`;
};

export const resolveQueueUrl = (queueKey: string): string | undefined => {
  return process.env[`${queueKey}_URL`] ?? buildQueueUrlFromEnv(queueKey);
};

export const buildOrderProducerQueueConfigs =
  (): OrderProducerQueueConfig[] => {
    const region = process.env.AWS_REGION ?? 'us-east-1';
    const persistenceQueueUrl = resolveQueueUrl('ORDER_PERSISTENCE_QUEUE');
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

    const notificationQueueUrl = resolveQueueUrl('ORDER_NOTIFICATION_QUEUE');
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
