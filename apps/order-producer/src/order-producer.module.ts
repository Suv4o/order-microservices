import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SqsModule } from '@ssut/nestjs-sqs';
import { OrderProducerController } from './order-producer.controller';
import { OrderProducerService } from './order-producer.service';
import { buildOrderProducerQueueConfigs } from '@app/aws-clients';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'].filter(Boolean),
      expandVariables: true,
    }),
    SqsModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const configs = buildOrderProducerQueueConfigs(configService);
        return {
          producers: configs.map(({ name, queueUrl, region }) => ({
            name,
            queueUrl,
            region,
          })),
        };
      },
    }),
  ],
  controllers: [OrderProducerController],
  providers: [OrderProducerService],
})
export class OrderProducerModule {}
