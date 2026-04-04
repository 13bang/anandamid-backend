import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../product/entities/product.entity';
import { ProductService } from '../product/product.service';

@Injectable()
export class ImageDownloadService {
  private readonly logger = new Logger(ImageDownloadService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    private readonly productService: ProductService,
  ) {}

  async startDownloadProcess() {
    this.logger.log('Mengambil data produk...');
    
    const products = await this.productRepo.find({
      relations: ['images'],
    });

    this.logger.log(`Total products: ${products.length}`);

    // Kita lempar ke fungsi terpisah tanpa 'await' biar jalan di background
    this.runBackgroundDownload(products);

    return {
      success: true,
      message: 'Script download berjalan di background. Cek log server untuk progresnya.',
      total_products: products.length,
    };
  }

  // Fungsi background
  private async runBackgroundDownload(products: Product[]) {
    let successCount = 0;
    let failCount = 0;

    for (const product of products) {
      try {
        this.logger.log(`Processing: ${product.name}`);
        // Memanggil fungsi dari product service persis seperti script lu
        await (this.productService as any).ensureImagesDownloaded(product);
        successCount++;
      } catch (error) {
        this.logger.error(`Gagal download image untuk produk: ${product.name}`, error);
        failCount++;
      }
    }

    this.logger.log(`DONE DOWNLOAD ALL IMAGES. Berhasil: ${successCount}, Gagal: ${failCount}`);
  }
}