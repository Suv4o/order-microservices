import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SqsModule } from '@ssut/nestjs-sqs';
import {
  OrderPersistenceService,
  ORDER_PERSISTENCE_CONSUMER_NAME,
} from './order-persistence.service';
import { AwsClientsModule, resolveQueueUrl } from '@app/aws-clients';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'].filter(Boolean),
      expandVariables: true,
    }),
    AwsClientsModule,
    SqsModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const queueUrl = resolveQueueUrl(
          configService,
          'ORDER_PERSISTENCE_QUEUE',
        );
        if (!queueUrl) {
          throw new Error(
            'ORDER_PERSISTENCE_QUEUE_URL (or ORDER_PERSISTENCE_QUEUE_NAME when AWS_ENDPOINT_URL is set) env variable is required for OrderPersistenceService.',
          );
        }

        return {
          consumers: [
            {
              name: ORDER_PERSISTENCE_CONSUMER_NAME,
              queueUrl,
              region: configService.get<string>('AWS_REGION', 'us-east-1'),
              batchSize: Number(
                configService.get<number>('SQS_MAX_MESSAGES', 5),
              ),
              waitTimeSeconds: Number(
                configService.get<number>('SQS_WAIT_TIME_SECONDS', 20),
              ),
              visibilityTimeout: Number(
                configService.get<number>('SQS_VISIBILITY_TIMEOUT', 60),
              ),
            },
          ],
        };
      },
    }),
  ],
  controllers: [],
  providers: [OrderPersistenceService],
})
export class OrderPersistenceModule {}
