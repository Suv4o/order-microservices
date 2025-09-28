import { Injectable, Logger } from '@nestjs/common';
import type { Message } from '@aws-sdk/client-sqs';
import { SqsMessageHandler } from '@ssut/nestjs-sqs';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { AwsClientsService } from '@app/aws-clients';
import { ensureOrderMessage, OrderDto } from '@app/common-dto';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

export const ORDER_PERSISTENCE_CONSUMER_NAME = 'orderPersistenceConsumer';

@Injectable()
export class OrderPersistenceService {
  private readonly logger = new Logger(OrderPersistenceService.name);
  private readonly ordersTableName: string;
  private readonly documentClient: DynamoDBDocumentClient;

  constructor(private readonly awsClientsService: AwsClientsService) {
    this.ordersTableName = process.env.ORDERS_TABLE_NAME ?? '';
    if (!this.ordersTableName) {
      throw new Error(
        'ORDERS_TABLE_NAME env variable is required for OrderPersistenceService.',
      );
    }

    this.documentClient = this.awsClientsService.getDynamoDocumentClient();
  }

  @SqsMessageHandler(ORDER_PERSISTENCE_CONSUMER_NAME, false)
  async handleOrderMessage(message: Message): Promise<void> {
    if (!message.Body) {
      this.logger.warn('Received SQS message without a body. Skipping.');
      return;
    }

    let order: OrderDto;
    try {
      order = JSON.parse(message.Body) as OrderDto;
    } catch (error) {
      this.logger.error(
        `Failed to parse order message ${message.MessageId ?? 'unknown'}.`,
        error as Error,
      );
      throw error;
    }

    const normalized = ensureOrderMessage(order);

    await this.documentClient.send(
      new PutCommand({
        TableName: this.ordersTableName,
        Item: {
          pk: `ORDER#${normalized.orderId}`,
          sk: `CUSTOMER#${normalized.customerId}`,
          orderId: normalized.orderId,
          customerId: normalized.customerId,
          totalAmount: normalized.totalAmount,
          currency: normalized.currency,
          notes: normalized.notes,
          createdAtIso: normalized.createdAtIso,
          items: normalized.items,
          metadata: normalized.metadata ?? {},
        },
      }),
    );

    this.logger.log(`Order ${normalized.orderId} persisted to DynamoDB.`);
  }
}
