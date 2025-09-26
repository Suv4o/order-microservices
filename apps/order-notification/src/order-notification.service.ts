import { Injectable } from '@nestjs/common';

@Injectable()
export class OrderNotificationService {
  getHello(): string {
    return 'Hello World!';
  }
}
