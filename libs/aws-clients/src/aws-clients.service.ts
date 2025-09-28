import { Injectable } from '@nestjs/common';
import { SQSClient } from '@aws-sdk/client-sqs';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { SESv2Client } from '@aws-sdk/client-sesv2';

@Injectable()
export class AwsClientsService {
  private sqsClient?: SQSClient;
  private dynamoDocumentClient?: DynamoDBDocumentClient;
  private sesClient?: SESv2Client;

  private readonly region = process.env.AWS_REGION ?? 'us-east-1';
  private readonly endpoint = process.env.AWS_ENDPOINT_URL;

  getSqsClient(): SQSClient {
    if (!this.sqsClient) {
      this.sqsClient = new SQSClient({
        region: this.region,
        endpoint: this.endpoint,
      });
    }
    return this.sqsClient;
  }

  getDynamoDocumentClient(): DynamoDBDocumentClient {
    if (!this.dynamoDocumentClient) {
      const dynamoClient = new DynamoDBClient({
        region: this.region,
        endpoint: this.endpoint,
      });
      this.dynamoDocumentClient = DynamoDBDocumentClient.from(dynamoClient, {
        marshallOptions: {
          removeUndefinedValues: true,
          convertClassInstanceToMap: true,
        },
      });
    }
    return this.dynamoDocumentClient;
  }

  getSesClient(): SESv2Client {
    if (!this.sesClient) {
      this.sesClient = new SESv2Client({
        region: this.region,
        endpoint: this.endpoint,
      });
    }
    return this.sesClient;
  }
}
