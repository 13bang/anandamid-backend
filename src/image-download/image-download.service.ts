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

    const total = products.length;

    this.logger.log(`🚀 START DOWNLOAD ${total} PRODUCTS`);

    for (let i = 0; i < total; i++) {
      const product = products[i];
      const current = i + 1;
      const remaining = total - current;

      try {
        this.logger.log(
          `📦 [${current}/${total}] Processing: ${product.name} | Sisa: ${remaining}`
        );

        await (this.productService as any).ensureImagesDownloaded(product);

        successCount++;

        this.logger.log(
          `✅ SUCCESS [${current}/${total}] ${product.name} | Sisa: ${remaining}`
        );
      } catch (error) {
        failCount++;

        this.logger.error(
          `❌ FAILED [${current}/${total}] ${product.name} | Sisa: ${remaining}`,
          error
        );
      }
    }

    this.logger.log(`🎉 DONE DOWNLOAD ALL IMAGES`);
    this.logger.log(`✅ Berhasil: ${successCount}`);
    this.logger.log(`❌ Gagal: ${failCount}`);
  }
}