import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Message } from '@aws-sdk/client-sqs';
import { SqsMessageHandler } from '@ssut/nestjs-sqs';
import { SendEmailCommand } from '@aws-sdk/client-sesv2';
import { AwsClientsService, resolveQueueUrl } from '@app/aws-clients';
import { ensureOrderMessage, OrderDto } from '@app/common-dto';
import type { SESv2Client } from '@aws-sdk/client-sesv2';

export const ORDER_NOTIFICATION_CONSUMER_NAME = 'orderNotificationConsumer';

@Injectable()
export class OrderNotificationService {
  private readonly logger = new Logger(OrderNotificationService.name);
  private readonly fromAddress: string;
  private readonly recipients: string[];
  private readonly sesClient: SESv2Client;

  constructor(
    private readonly awsClientsService: AwsClientsService,
    private readonly configService: ConfigService,
  ) {
    this.fromAddress = this.configService.get<string>(
      'NOTIFICATION_EMAIL_FROM',
      '',
    );
    const recipientsRaw = this.configService.get<string>(
      'NOTIFICATION_EMAIL_TO',
      '',
    );
    this.recipients = recipientsRaw
      .split(',')
      .map((email) => email.trim())
      .filter(Boolean);
    const resolvedQueueUrl = resolveQueueUrl(
      this.configService,
      'ORDER_NOTIFICATION_QUEUE',
    );
    if (!resolvedQueueUrl) {
      throw new Error(
        'ORDER_NOTIFICATION_QUEUE_URL (or ORDER_NOTIFICATION_QUEUE_NAME when AWS_ENDPOINT_URL is set) env variable is required for OrderNotificationService.',
      );
    }
    if (!this.fromAddress) {
      throw new Error(
        'NOTIFICATION_EMAIL_FROM env variable is required for OrderNotificationService.',
      );
    }
    if (this.recipients.length === 0) {
      throw new Error(
        'NOTIFICATION_EMAIL_TO env variable must include at least one recipient.',
      );
    }

    this.sesClient = this.awsClientsService.getSesClient();
  }

  @SqsMessageHandler(ORDER_NOTIFICATION_CONSUMER_NAME, false)
  async handleOrderNotification(message: Message): Promise<void> {
    if (!message.Body) {
      this.logger.warn('Received SQS message without a body. Skipping.');
      return;
    }

    let order: OrderDto;
    try {
      order = JSON.parse(message.Body) as OrderDto;
    } catch (error) {
      this.logger.error(
        `Failed to parse notification message ${message.MessageId ?? 'unknown'}.`,
        error as Error,
      );
      throw error;
    }

    const normalized = ensureOrderMessage(order);
    const subject = `New order ${normalized.orderId}`;
    const textBody = `A new order was received.\nOrder ID: ${normalized.orderId}\nCustomer: ${normalized.customerId}\nTotal: ${normalized.totalAmount} ${normalized.currency}`;
    const htmlBody = `
      <h1>New order received</h1>
      <p><strong>Order ID:</strong> ${normalized.orderId}</p>
      <p><strong>Customer:</strong> ${normalized.customerId}</p>
      <p><strong>Total:</strong> ${normalized.totalAmount} ${normalized.currency}</p>
      <p><strong>Created at:</strong> ${normalized.createdAtIso}</p>
    `;

    await this.sesClient.send(
      new SendEmailCommand({
        FromEmailAddress: this.fromAddress,
        Destination: { ToAddresses: this.recipients },
        Content: {
          Simple: {
            Subject: { Data: subject },
            Body: {
              Text: { Data: textBody },
              Html: { Data: htmlBody },
            },
          },
        },
      }),
    );

    this.logger.log(`Notification email sent for order ${normalized.orderId}.`);
  }
}
