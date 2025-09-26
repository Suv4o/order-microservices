import { Injectable } from '@nestjs/common';

@Injectable()
export class OrderPersistenceService {
  getHello(): string {
    return 'Hello World!';
  }
}
