import { Test, TestingModule } from '@nestjs/testing';
import { ImageDownloadService } from './image-download.service';

describe('ImageDownloadService', () => {
  let service: ImageDownloadService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ImageDownloadService],
    }).compile();

    service = module.get<ImageDownloadService>(ImageDownloadService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
