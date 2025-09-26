import { Injectable } from '@nestjs/common';

@Injectable()
export class OrderProducerService {
  getHello(): string {
    return 'Hello World!';
  }
}
