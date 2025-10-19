import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientProxyFactory } from '@nestjs/microservices';
import { OrderProducerController } from './order-producer.controller';
import { OrderProducerService } from './order-producer.service';
import {
  buildOrderProducerQueueConfigs,
  AwsClientsService,
} from '@app/aws-clients';
import { SqsClient, type SqsClientOptions } from '@suv4o/nestjs-sqs';
import { ORDER_SQS_CLIENT_TOKEN } from './order-producer.tokens';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'].filter(Boolean),
      expandVariables: true,
    }),
  ],
  controllers: [OrderProducerController],
  providers: [
    OrderProducerService,
    {
      provide: ORDER_SQS_CLIENT_TOKEN,
      useFactory: (configService: ConfigService) => {
        const awsClientsService = new AwsClientsService(configService);
        const sqsClient = awsClientsService.getSqsClient();
        const configs = buildOrderProducerQueueConfigs(configService);

        const client = ClientProxyFactory.create({
          customClass: SqsClient,
          options: {
            client: sqsClient,
            queues: configs.map((config) => ({
              pattern: config.pattern,
              queueUrl: config.queueUrl,
              isFifo: config.isFifo,
            })),
          } satisfies SqsClientOptions,
        });

        return client;
      },
      inject: [ConfigService],
    },
  ],
})
export class OrderProducerModule {}
