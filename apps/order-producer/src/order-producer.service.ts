import { Injectable, Logger } from '@nestjs/common';
import type { MessageAttributeValue } from '@aws-sdk/client-sqs';
import { SqsService } from '@ssut/nestjs-sqs';
import { randomUUID } from 'crypto';
import { ensureOrderMessage, OrderDto } from '@app/common-dto';
import {
  buildOrderProducerQueueConfigs,
  type OrderProducerQueueConfig,
} from '@app/aws-clients';

@Injectable()
export class OrderProducerService {
  private readonly logger = new Logger(OrderProducerService.name);
  private readonly queueConfigs: OrderProducerQueueConfig[];

  constructor(private readonly sqsService: SqsService) {
    this.queueConfigs = buildOrderProducerQueueConfigs();
  }

  async publishOrder(order: OrderDto): Promise<void> {
    const normalized = ensureOrderMessage(order);
    const messageAttributes: Record<string, MessageAttributeValue> = {
      orderId: {
        DataType: 'String',
        StringValue: normalized.orderId,
      },
      customerId: {
        DataType: 'String',
        StringValue: normalized.customerId,
      },
      createdAtIso: {
        DataType: 'String',
        StringValue: normalized.createdAtIso ?? new Date().toISOString(),
      },
    };

    const results = await Promise.allSettled(
      this.queueConfigs.map(async (config) => {
        await this.sqsService.send(config.name, {
          id: randomUUID(),
          body: normalized,
          messageAttributes,
          ...(config.isFifo
            ? {
                groupId: normalized.customerId,
                deduplicationId: randomUUID(),
              }
            : {}),
        });
        this.logger.log(
          `Order ${normalized.orderId} published to ${config.queueUrl}`,
        );
      }),
    );

    const failures = results.filter(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );
    if (failures.length > 0) {
      failures.forEach((failure) => {
        this.logger.error(
          'Failed to publish order to one or more queues',
          failure.reason as Error,
        );
      });
      throw failures[0].reason;
    }
  }
}
