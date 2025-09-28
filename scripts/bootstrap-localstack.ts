import { setTimeout as sleep } from 'node:timers/promises';
import {
  SQSClient,
  CreateQueueCommand,
  GetQueueAttributesCommand,
  GetQueueUrlCommand,
  ListQueuesCommand,
} from '@aws-sdk/client-sqs';
import {
  DynamoDBClient,
  CreateTableCommand,
  DescribeTableCommand,
} from '@aws-sdk/client-dynamodb';
import { SESv2Client, CreateEmailIdentityCommand } from '@aws-sdk/client-sesv2';

const region = process.env.AWS_REGION ?? 'us-east-1';
const endpoint = process.env.AWS_ENDPOINT_URL ?? 'http://localhost:4566';
const accessKeyId = process.env.AWS_ACCESS_KEY_ID ?? 'test';
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY ?? 'test';

const persistenceQueueName =
  process.env.ORDER_PERSISTENCE_QUEUE_NAME ?? 'order-persistence-queue';
const notificationQueueName =
  process.env.ORDER_NOTIFICATION_QUEUE_NAME ?? 'order-notification-queue';
const tableName = process.env.ORDERS_TABLE_NAME ?? 'orders-table';
const notificationEmailFrom =
  process.env.NOTIFICATION_EMAIL_FROM ?? 'sender@example.com';
const skipSesIdentityBootstrap =
  (process.env.SKIP_SES ?? '').toLowerCase() === 'true';
const sesEndpoint = process.env.SES_ENDPOINT_URL ?? 'http://localhost:8005';
const sesRegion = process.env.SES_REGION ?? region;

const clientsConfig = {
  region,
  endpoint,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
};

const sqs = new SQSClient(clientsConfig);
const dynamo = new DynamoDBClient(clientsConfig);
const ses = new SESv2Client(clientsConfig);

async function waitForLocalStack(): Promise<void> {
  const maxAttempts = Number(process.env.LOCALSTACK_HEALTH_RETRIES ?? 15);
  const backoffMs = Number(process.env.LOCALSTACK_HEALTH_INTERVAL_MS ?? 1000);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await sqs.send(new ListQueuesCommand({ MaxResults: 1 }));
      console.log('LocalStack is ready.');
      return;
    } catch (error: unknown) {
      if (attempt === maxAttempts) {
        throw error;
      }
    }

    console.log(
      `Waiting for LocalStack to become available (attempt ${attempt}/${maxAttempts})...`,
    );
    await sleep(backoffMs);
  }

  throw new Error('LocalStack did not become ready in time.');
}

async function ensureQueue(queueName: string): Promise<string> {
  await sqs.send(
    new CreateQueueCommand({
      QueueName: queueName,
      Attributes: {
        VisibilityTimeout: '60',
        ReceiveMessageWaitTimeSeconds: '20',
      },
    }),
  );

  const { QueueUrl } = await sqs.send(
    new GetQueueUrlCommand({
      QueueName: queueName,
    }),
  );
  if (!QueueUrl) {
    throw new Error(`Failed to resolve QueueUrl for ${queueName}`);
  }

  const { Attributes } = await sqs.send(
    new GetQueueAttributesCommand({
      QueueUrl,
      AttributeNames: ['QueueArn'],
    }),
  );

  const queueUrl = QueueUrl;
  console.log(`Queue ready: ${queueUrl}`);
  if (Attributes?.QueueArn) {
    console.log(`Queue ARN: ${Attributes.QueueArn}`);
  }

  return queueUrl;
}

async function ensureOrdersTable(): Promise<void> {
  const tableExists = await dynamo
    .send(new DescribeTableCommand({ TableName: tableName }))
    .then(() => true)
    .catch((error: unknown) => {
      if (
        error instanceof Error &&
        error.name === 'ResourceNotFoundException'
      ) {
        return false;
      }
      throw error;
    });

  if (!tableExists) {
    console.log(`Creating DynamoDB table ${tableName}...`);
    await dynamo.send(
      new CreateTableCommand({
        TableName: tableName,
        AttributeDefinitions: [
          { AttributeName: 'pk', AttributeType: 'S' },
          { AttributeName: 'sk', AttributeType: 'S' },
        ],
        KeySchema: [
          { AttributeName: 'pk', KeyType: 'HASH' },
          { AttributeName: 'sk', KeyType: 'RANGE' },
        ],
        BillingMode: 'PAY_PER_REQUEST',
      }),
    );
    // DynamoDB in LocalStack can take a moment to settle
    await sleep(1000);
  }

  console.log(`DynamoDB table ready: ${tableName}`);
}

async function ensureSesIdentity(): Promise<void> {
  if (skipSesIdentityBootstrap) {
    console.warn(
      'Skipping SES identity creation because SKIP_SES is set to true.',
    );
    return;
  }
  if (!notificationEmailFrom) {
    console.warn(
      'NOTIFICATION_EMAIL_FROM is not set. Skipping SES identity creation.',
    );
    return;
  }

  try {
    await ses.send(
      new CreateEmailIdentityCommand({
        EmailIdentity: notificationEmailFrom,
      }),
    );
    console.log(`SES identity verified: ${notificationEmailFrom}`);
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AlreadyExistsException') {
      console.log(`SES identity already exists: ${notificationEmailFrom}`);
      return;
    }
    const metadata = (error as { $metadata?: { httpStatusCode?: number } })
      ?.$metadata;
    const errorType = (error as { __type?: string })?.__type;
    if (metadata?.httpStatusCode === 501 || errorType === 'InternalFailure') {
      console.warn(
        "LocalStack SESv2 API isn't available in this environment. Set SKIP_SES=true to suppress this warning.",
      );
      return;
    }
    throw error;
  }
}

async function main(): Promise<void> {
  console.log('Bootstrapping LocalStack resources...');
  await waitForLocalStack();
  const persistenceQueueUrl = await ensureQueue(persistenceQueueName);
  let notificationQueueUrl: string | undefined;

  if (notificationQueueName) {
    notificationQueueUrl = await ensureQueue(notificationQueueName);
  }

  await ensureOrdersTable();
  await ensureSesIdentity();

  console.log('\nSet the following environment variables for the apps:');
  console.log(`AWS_REGION=${region}`);
  console.log(`AWS_ENDPOINT_URL=${endpoint}`);
  console.log(`AWS_ACCESS_KEY_ID=${accessKeyId}`);
  console.log(`AWS_SECRET_ACCESS_KEY=${secretAccessKey}`);
  console.log(`SES_ENDPOINT_URL=${sesEndpoint}`);
  console.log(`SES_REGION=${sesRegion}`);
  console.log(`SKIP_SES=${skipSesIdentityBootstrap}`);
  console.log(`ORDERS_TABLE_NAME=${tableName}`);
  console.log(`ORDER_PERSISTENCE_QUEUE_URL=${persistenceQueueUrl}`);
  if (notificationQueueUrl) {
    console.log(`ORDER_NOTIFICATION_QUEUE_URL=${notificationQueueUrl}`);
  }
  console.log(`NOTIFICATION_EMAIL_FROM=${notificationEmailFrom}`);
  console.log('NOTIFICATION_EMAIL_TO=receiver@example.com');
  console.log('\nLocalStack bootstrap complete.');
}

main().catch((error) => {
  console.error('Failed to bootstrap LocalStack:', error);
  process.exit(1);
});
