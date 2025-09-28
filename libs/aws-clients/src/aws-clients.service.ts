import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SQSClient } from '@aws-sdk/client-sqs';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { SESv2Client } from '@aws-sdk/client-sesv2';

@Injectable()
export class AwsClientsService {
  private sqsClient?: SQSClient;
  private dynamoDocumentClient?: DynamoDBDocumentClient;
  private sesClient?: SESv2Client;

  private readonly region: string;
  private readonly endpoint?: string;
  private readonly sesRegion: string;
  private readonly sesEndpoint?: string;

  constructor(private readonly configService: ConfigService) {
    this.region = this.configService.get<string>('AWS_REGION', 'us-east-1');
    this.endpoint = this.configService.get<string>('AWS_ENDPOINT_URL');
    this.sesRegion =
      this.configService.get<string>('SES_REGION') ?? this.region;
    this.sesEndpoint =
      this.configService.get<string>('SES_ENDPOINT_URL') ?? this.endpoint;
  }

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
        region: this.sesRegion,
        endpoint: this.sesEndpoint,
      });
    }
    return this.sesClient;
  }
}
