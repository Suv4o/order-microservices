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
  private readonly sesClient?: SESv2Client;
  private readonly skipSes: boolean;

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

    const skipSesEnv = this.configService.get<string>('SKIP_SES', 'false');
    this.skipSes = skipSesEnv.toLowerCase() === 'true';

    if (this.skipSes) {
      this.logger.warn(
        'SKIP_SES is true. Order notification emails will be skipped.',
      );
    } else {
      this.sesClient = this.awsClientsService.getSesClient();
    }
  }

  @SqsMessageHandler(ORDER_NOTIFICATION_CONSUMER_NAME, false)
  async handleOrderNotification(message: Message): Promise<void> {
    if (this.skipSes) {
      this.logger.debug(
        `Skipping email for message ${
          message.MessageId ?? 'unknown'
        } because SKIP_SES is true.`,
      );
      return;
    }

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

    if (!this.sesClient) {
      this.logger.error(
        'SES client is not configured. Ensure SKIP_SES is false and aws-ses-v2-local is running.',
      );
      throw new Error('SES client not configured');
    }

    try {
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
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        (error as { code?: string }).code === 'ECONNREFUSED'
      ) {
        this.logger.error(
          'Failed to reach aws-ses-v2-local. Start it with "npm run ses-local:start" or set SKIP_SES=true to disable email sending.',
        );
      } else {
        this.logger.error(
          'Failed to send notification email via SES.',
          error as Error,
        );
      }
      throw error;
    }

    this.logger.log(`Notification email sent for order ${normalized.orderId}.`);
  }
}
