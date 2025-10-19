import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SendEmailCommand } from '@aws-sdk/client-sesv2';
import {
  AwsClientsService,
  getOrderNotificationQueueUrl,
} from '@app/aws-clients';
import { ensureOrderMessage, OrderDto } from '@app/common-dto';
import type { SESv2Client } from '@aws-sdk/client-sesv2';
import { sqsPattern } from '@suv4o/nestjs-sqs';

export const ORDER_NOTIFICATION_PATTERN = sqsPattern('order-notification');

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
    getOrderNotificationQueueUrl(this.configService);
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

  async handleOrderNotification(order: OrderDto): Promise<void> {
    if (this.skipSes) {
      this.logger.debug('Skipping email because SKIP_SES is true.');
      return;
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
