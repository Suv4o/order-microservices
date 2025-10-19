# Order Microservices

Event-driven microservices for managing orders on AWS using NestJS, `@suv4o/nestjs-sqs`, and the AWS SDK v3. The system is composed of three independent apps that communicate exclusively through Amazon SQS queues plus a shared set of utility libraries.

## Architecture at a Glance

| Service              | Role                                                                          | Queue                                                         | Downstream                     |
| -------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------ |
| `order-producer`     | Accepts/normalises incoming order payloads and publishes them to SQS.         | `ORDER_PERSISTENCE_QUEUE_URL`, `ORDER_NOTIFICATION_QUEUE_URL` | SQS                            |
| `order-persistence`  | Polls the persistence queue and saves orders in DynamoDB for durable storage. | `ORDER_PERSISTENCE_QUEUE_URL`                                 | DynamoDB (`ORDERS_TABLE_NAME`) |
| `order-notification` | Polls the notification queue and sends customer-facing notifications via SES. | `ORDER_NOTIFICATION_QUEUE_URL`                                | Amazon SES                     |

Supporting libraries live under `libs/`:

- `@app/common-dto` — shared DTOs and helpers, e.g. `ensureOrderMessage` used by every service before emitting or processing an order.
- `@app/aws-clients` — lazily-instantiated singletons for SQS, DynamoDB DocumentClient, and SESv2 so each service reuses the same AWS SDK clients.

> **Heads-up:** Only the order producer exposes an HTTP listener (port `3000`) so you can submit orders via REST. The persistence and notification workers bootstrap headless Nest application contexts and respond solely to SQS events registered through `@suv4o/nestjs-sqs`.

See `nestjs-sqs.md` for a standalone guide on adopting `@suv4o/nestjs-sqs` in new projects.

## Prerequisites

- Node.js 24+
- Docker Desktop (for running LocalStack locally)
- AWS credentials with permissions for SQS, DynamoDB, and SESv2 (configured via environment, shared credentials file, or the AWS CLI)
- For SES email delivery you must verify the sender domain/address and, if your SES account is in the sandbox, verify recipient addresses as well.

## Environment Variables

Create an `.env` file per service or export the variables in your shell before starting the processes.
Copy `.env.example` as a starting point for non-LocalStack environments, or `.env.localstack.example` when developing against LocalStack.

### Configuration loading order

The apps use Nest’s `@nestjs/config` module with global settings. On startup they search for environment files in the following order (first file found wins for each variable):

1. `.env.localstack`
2. `.env`

Each service also reads live environment variables, so anything exported in the terminal overrides file-based entries.

| Variable                        | Used by                   | Description                                                                                                                                           |
| ------------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AWS_REGION`                    | all                       | AWS region for every SDK client (default: `us-east-1`).                                                                                               |
| `AWS_ENDPOINT_URL`              | all                       | Optional override for AWS service endpoints (e.g., `http://localhost:4566` for LocalStack).                                                           |
| `AWS_ACCOUNT_ID`                | all                       | AWS account ID used when deriving LocalStack resource ARNs/URLs (default: `000000000000`).                                                            |
| `ORDER_PERSISTENCE_QUEUE_URL`   | producer, persistence     | SQS queue URL that persistence workers consume. Automatically derived when `AWS_ENDPOINT_URL` and `ORDER_PERSISTENCE_QUEUE_NAME` are provided.        |
| `ORDER_PERSISTENCE_QUEUE_NAME`  | producer, persistence     | Queue name used to derive the URL when targeting LocalStack.                                                                                          |
| `ORDER_NOTIFICATION_QUEUE_URL`  | producer, notification    | SQS queue URL that notification workers consume. Optional for the producer but required for notifications (also derived from `_NAME` when available). |
| `ORDER_NOTIFICATION_QUEUE_NAME` | producer, notification    | Queue name used to derive the URL when targeting LocalStack.                                                                                          |
| `ORDERS_TABLE_NAME`             | persistence               | DynamoDB table name storing orders.                                                                                                                   |
| `NOTIFICATION_EMAIL_FROM`       | notification              | Verified SES sender email address.                                                                                                                    |
| `NOTIFICATION_EMAIL_TO`         | notification              | Comma-separated list of recipient emails.                                                                                                             |
| `SQS_MAX_MESSAGES`              | persistence, notification | (Optional) Batch size for each poll (default `5`).                                                                                                    |
| `SQS_WAIT_TIME_SECONDS`         | persistence, notification | (Optional) Long-poll wait time (default `20`).                                                                                                        |
| `SQS_VISIBILITY_TIMEOUT`        | persistence, notification | (Optional) Visibility timeout for inflight messages (default `60`).                                                                                   |
| `SES_ENDPOINT_URL`              | notification              | Override for the SESv2 client endpoint. Set to `http://localhost:8005` when using `aws-ses-v2-local`.                                                 |
| `SES_REGION`                    | notification              | Region used by the SESv2 client. Defaults to `AWS_REGION`; use `aws-ses-v2-local` for the local mock server.                                          |
| `SKIP_SES`                      | notification, bootstrap   | When `true`, skips sending notification emails and suppresses SES identity creation during LocalStack bootstrap.                                      |

### Local development with LocalStack

Everything you need to spin up LocalStack and provision the required AWS resources is bundled in this repo.

1. **Start Docker Desktop** and copy the sample environment file:

```bash
cp .env.localstack.example .env.localstack
cp .env.localstack.example .env
```

2. **Bootstrap LocalStack queues, table, and SES identity**:

```bash
npm run localstack:bootstrap
```

The bootstrap script waits for LocalStack to become healthy, creates both queues, provisions the DynamoDB table, and attempts to verify the SES sender identity. If your LocalStack tier doesn’t emulate SESv2, set `SKIP_SES=true` (already enabled in `.env.localstack.example`) to suppress the identity step and rely solely on the local mock server.

3. **Load the generated environment variables** (zsh/bash):

```bash
npm run localstack:env
```

> The helper script wraps `set -a; source .env.localstack; set +a` so your current shell inherits every variable. You can pass an alternate file path, e.g. `source scripts/load-localstack-env.sh .env.other`. Running `npm run localstack:env` executes the same helper but, because it spawns a subshell, the exports won’t persist once the command finishes—always `source` it directly when you need the variables in your terminal.

4. **Start the microservices in separate terminals** (after sourcing the env file for each terminal):

```bash
npm run start:producer:dev
npm run start:persistence:dev
npm run start:notification:dev
```

5. **Open a DynamoDB UI** (optional) to explore LocalStack tables:

```bash
npm run dynamodb:admin
```

> The script uses `npx dynamodb-admin` with `DYNAMO_ENDPOINT=http://localhost:4566`. Once it starts, open [http://localhost:8001](http://localhost:8001) to browse and edit table contents.

6. **Start the local SES mock server** (run this before the notification worker processes messages):

```bash
npm run ses-local:start
```

> The server exposes the SESv2 API at `http://localhost:8005` and a web inbox at the same address. Leave it running while the notification worker is active. If you’ve already started it earlier, you can skip this step; otherwise, run it now before sending test orders. Set `SKIP_SES=true` if you prefer to suppress email sending locally.

7. **Inspect LocalStack logs** (optional):

```bash
npm run localstack:logs
```

8. **Shut everything down** when finished:

```bash
npm run localstack:stop
```

> The bootstrap script is idempotent—you can re-run it safely after clearing LocalStack’s state to recreate the queues/table.

## Install & Build

```bash
npm install
npm run build       # builds all three apps
```

## Running the Services

Each app has dedicated scripts under `package.json`.

```bash
# Order producer – exposes HTTP REST endpoint on port 3000
npm run start:producer

# Persistence worker – polls SQS and persists to DynamoDB
npm run start:persistence

# Notification worker – polls SQS and sends SES emails
npm run start:notification

# SES mock server – provides a local SESv2 API and inbox
npm run ses-local:start

# DynamoDB admin UI – browse LocalStack tables at http://localhost:8001
npm run dynamodb:admin
```

The producer exposes an injectable `OrderProducerService` with a `publishOrder` method. You can use it from a REPL or small script, e.g.:

```ts
import { NestFactory } from '@nestjs/core';
import { OrderProducerModule } from './apps/order-producer/src/order-producer.module';
import { OrderProducerService } from './apps/order-producer/src/order-producer.service';

async function main() {
  const app = await NestFactory.createApplicationContext(OrderProducerModule);
  const service = app.get(OrderProducerService);
  await service.publishOrder({
    orderId: 'demo-123',
    customerId: 'customer-42',
    totalAmount: 125.5,
    currency: 'USD',
    items: [{ sku: 'sku-1', quantity: 1, unitPrice: 125.5 }],
  });
  await app.close();
}

void main();
```

## Testing & Quality

```bash
npm run lint
npm run test
```

## Deployment Notes

- Provision SQS queues, the DynamoDB table, and SES identities ahead of time. If you need both persistence and notification flows, fan-out the producer to two queues as the code already supports.
- Update infrastructure-as-code templates (e.g., CDK, Terraform, SAM) to supply the environment variables noted above when deploying.

## Troubleshooting

- **Messages not deleted:** Check `SQS_VISIBILITY_TIMEOUT` against the time it takes to persist or send emails. The worker logs include the message ID when failures occur.
- **SES sandbox errors:** Either move the SES account out of sandbox mode or verify every recipient in `NOTIFICATION_EMAIL_TO`.
- **No HTTP port:** This is intentional. Use Nest application contexts or background workers to interact with the services.

## License

MIT
