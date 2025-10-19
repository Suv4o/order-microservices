import { Injectable, Logger, Inject, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import type { MessageAttributeValue } from '@aws-sdk/client-sqs';
import { randomUUID } from 'crypto';
import { ensureOrderMessage, OrderDto } from '@app/common-dto';
import type { SqsOutboundMessage } from '@suv4o/nestjs-sqs';
import {
  buildOrderProducerQueueConfigs,
  type OrderProducerQueueConfig,
} from '@app/aws-clients';
import { ORDER_SQS_CLIENT_TOKEN } from './order-producer.tokens';

@Injectable()
export class OrderProducerService implements OnModuleInit {
  private readonly logger = new Logger(OrderProducerService.name);
  private readonly queueConfigs: OrderProducerQueueConfig[];

  constructor(
    @Inject(ORDER_SQS_CLIENT_TOKEN) private readonly sqsClient: ClientProxy,
    private readonly configService: ConfigService,
  ) {
    this.queueConfigs = buildOrderProducerQueueConfigs(this.configService);
  }

  async onModuleInit(): Promise<void> {
    await this.sqsClient.connect();
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
        const message: SqsOutboundMessage<OrderDto> = {
          body: normalized,
          messageAttributes,
          ...(config.isFifo
            ? {
                groupId: normalized.customerId,
                deduplicationId: randomUUID(),
              }
            : {}),
        };

        // Use emit for fire-and-forget messaging
        await firstValueFrom(this.sqsClient.emit(config.pattern, message));

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
