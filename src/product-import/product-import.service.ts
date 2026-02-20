import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../product/entities/product.entity';
import { Category } from '../category/entities/category.entity';
import { ProductImage } from '../product-image/entities/product-image.entity';
import { randomUUID } from 'crypto';

@Injectable()
export class ProductImportService {
    constructor(
        @InjectRepository(Product)
        private readonly productRepo: Repository<Product>,
        
        @InjectRepository(Category)
        private readonly categoryRepo: Repository<Category>,
        
        @InjectRepository(ProductImage)
    private readonly productImageRepo: Repository<ProductImage>,
  ) {}

  // =====================================================
  // TEMPLATE (TIDAK DIUBAH)
  // =====================================================
  async generateTemplate(): Promise<Buffer> {
    const headers = [
    //   'product_id',
      'name',
      'description',
      'price_normal',
      'price_discount',
      'stock',
      'sku_seller',
      'warranty',
      'category_name',
      'category_code',
      'is_active',
      'is_popular',
      'image_1',
      'image_2',
      'image_3',
      'image_4',
      'image_5',
      'image_6',
      'image_7',
      'image_8',
      'image_9',
      'image_10',
    ];
    
    const exampleRow = [
      '1731793882758546842',
      'PRINTER CANON PIXMA G2010',
      'Deskripsi produk disini...',
      2125000,
      100000,
      48,
      '1102127',
      'Garansi Produsen',
      'Printer & Scanner',
      '830984',
      true,
      false,
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
    ];

    const worksheet = XLSX.utils.aoa_to_sheet([headers, exampleRow]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');

    return XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
    });
  }

  // =====================================================
  // ✅ UPLOAD (INSERT SEMUA, SKU BOLEH DUPLIKAT)
  // =====================================================
  async uploadProducts(buffer: Buffer) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet);

    const duplicateSkus: string[] = [];
    let totalCreated = 0;

    for (const row of rows) {
        const existingSku = await this.productRepo.findOne({
        where: { sku_seller: row.sku_seller },
        });

        if (existingSku) {
        duplicateSkus.push(row.sku_seller);
        }

        const category = await this.categoryRepo.findOne({
        where: { name: row.category_name },
        });

        const product = new Product();
        product.product_id = randomUUID();
        product.name = row.name;
        product.description = row.description;
        product.price_normal = Number(row.price_normal);
        product.price_discount = Number(row.price_discount) || 0;
        product.stock = Number(row.stock) || 0;
        product.sku_seller = row.sku_seller;
        product.warranty = row.warranty;
        product.is_active = row.is_active === true || row.is_active === 'true';
        product.is_popular = row.is_popular === true || row.is_popular === 'true';
        product.category = category ?? null;

        const savedProduct = await this.productRepo.save(product) as Product;

        // insert images
        for (let i = 1; i <= 10; i++) {
        const imageUrl = row[`image_${i}`];
        if (imageUrl) {
            await this.productImageRepo.save({
            image_url: imageUrl,
            sort_order: i,
            product: savedProduct,
            } as ProductImage);
        }
        }

        totalCreated++;
    }

    return {
        message: 'Upload selesai',
        total_created: totalCreated,
        duplicate_sku_detected: duplicateSkus,
    };
    }
// =====================================================
  // ✅ UPDATE (BERDASARKAN SKU SELLER)
  // =====================================================
  async updateProducts(buffer: Buffer) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet);

    const updated: string[] = [];
    const notFound: string[] = [];

    for (const row of rows) {
      const product = await this.productRepo.findOne({
        where: { sku_seller: String(row.sku_seller) },
      });

      if (!product) {
        notFound.push(row.sku_seller);
        continue;
      }

      const category = await this.categoryRepo.findOne({
        where: { name: row.category_name },
      });

      await this.productRepo.update(
        { id: product.id },
        {
          product_id: String(row.product_id),
          name: row.name,
          description: row.description,
          price_normal: Number(row.price_normal),
          price_discount: row.price_discount ? Number(row.price_discount) : null,
          stock: Number(row.stock) || 0,
          warranty: row.warranty,
          is_active: row.is_active === true || row.is_active === 'true',
          is_popular: row.is_popular === true || row.is_popular === 'true',
          category: category ?? null, 
        },
      );

      await this.productImageRepo.delete({ 
        product: { id: product.id } 
      } as any);

      // 5. Insert image baru
      for (let i = 1; i <= 10; i++) {
        const imageUrl = row[`image_${i}`];
        if (imageUrl) {
          await this.productImageRepo.save({
            product: product,
            image_url: imageUrl,
            sort_order: i
          });
        }
      }

      updated.push(row.sku_seller);
    }

    return {
      message: 'Update selesai',
      total_updated: updated.length,
      not_found_sku: notFound,
    };
  }
}