import { Test, TestingModule } from '@nestjs/testing';
import { AwsClientsService } from './aws-clients.service';

describe('AwsClientsService', () => {
  let service: AwsClientsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AwsClientsService],
    }).compile();

    service = module.get<AwsClientsService>(AwsClientsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
