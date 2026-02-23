import { Injectable, Logger } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../product/entities/product.entity';
import { Category } from '../category/entities/category.entity';
import { ProductImage } from '../product-image/entities/product-image.entity';
import { randomUUID } from 'crypto';

@Injectable()
export class ProductImportService {
  private readonly logger = new Logger(ProductImportService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,

    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,

    @InjectRepository(ProductImage)
    private readonly productImageRepo: Repository<ProductImage>,
  ) {}

  async generateTemplate(): Promise<Buffer> {
    const headers = [
      'name','description','price_normal','price_discount','stock','sku_seller',
      'warranty','category_name','category_code','is_active','is_popular',
      'image_1','image_2','image_3','image_4','image_5','image_6','image_7','image_8','image_9','image_10'
    ];

    const exampleRow = [
      'PRINTER CANON PIXMA G2010','Deskripsi produk disini...',2125000,100000,48,
      '1102127','Garansi Produsen','Printer & Scanner','830984',true,false,
      'https://example.com/image1.jpg','https://example.com/image2.jpg','','','','','','','','',''
    ];

    const worksheet = XLSX.utils.aoa_to_sheet([headers, exampleRow]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  // UPLOAD PRODUCT
  async uploadProducts(buffer: Buffer) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet);

    let totalCreated = 0;

    for (let idx = 0; idx < rows.length; idx++) {
      const row = rows[idx];
      try {
        this.logger.log(`Upload row ${idx + 1}: SKU=${row.sku_seller}, Name=${row.name}`);

        // Kategori by code
        let category: Category | null = null;

          if (row.category_code) {
            category = await this.categoryRepo.findOne({
              where: { code: row.category_code }
            });

            if (!category) {
              // Kalau belum ada → create
              category = this.categoryRepo.create({
                code: row.category_code,
                name: row.category_name
              });
              await this.categoryRepo.save(category);
            } else {
              // Kalau ada tapi nama beda → update
              if (row.category_name && category.name !== row.category_name) {
                category.name = row.category_name;
                await this.categoryRepo.save(category);
                this.logger.log(
                  `Category updated: code=${category.code}, new_name=${category.name}`
                );
              }
            }
          }

        const product = new Product();
        product.product_id = randomUUID();
        product.name = row.name;
        product.description = row.description;
        product.price_normal = Number(row.price_normal) || 0;
        product.price_discount = Number(row.price_discount) || 0;
        product.stock = Number(row.stock) || 0;
        product.sku_seller = row.sku_seller;
        product.warranty = row.warranty;
        product.is_active = row.is_active === true || row.is_active === 'true';
        product.is_popular = row.is_popular === true || row.is_popular === 'true';
        product.category = category ?? null;

        const savedProduct = await this.productRepo.save(product);

        // Images
        for (let i = 1; i <= 10; i++) {
          const imageUrl = row[`image_${i}`];
          if (imageUrl) {
            await this.productImageRepo.save({
              product: savedProduct,
              image_url: imageUrl,
              sort_order: i
            });
          }
        }

        totalCreated++;
      } catch (err) {
        this.logger.error(`Error processing row ${idx + 1}: ${err.message}`, err.stack);
      }
    }

    return { message: 'Upload selesai', total_created: totalCreated };
  }

  // UPDATE PRODUCT
  async updateProducts(buffer: Buffer) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet);

    let totalUpdated = 0;

    for (let idx = 0; idx < rows.length; idx++) {
      const row = rows[idx];
      try {
        this.logger.log(`Update row ${idx + 1}: SKU=${row.sku_seller}, Name=${row.name}`);

        // Cek SKU
        let product = await this.productRepo.findOne({ where: { sku_seller: row.sku_seller } });

        // Kategori by code
        let category: Category | null = null;

          if (row.category_code) {
            category = await this.categoryRepo.findOne({
              where: { code: row.category_code }
            });

            if (!category) {
              // Kalau belum ada → create
              category = this.categoryRepo.create({
                code: row.category_code,
                name: row.category_name
              });
              await this.categoryRepo.save(category);
            } else {
              // Kalau ada tapi nama beda → update
              if (row.category_name && category.name !== row.category_name) {
                category.name = row.category_name;
                await this.categoryRepo.save(category);
                this.logger.log(
                  `Category updated: code=${category.code}, new_name=${category.name}`
                );
              }
            }
          }

        if (!product) {
          product = new Product();
          product.product_id = randomUUID();
          product.sku_seller = row.sku_seller;
        }

        // Update fields
        product.name = row.name;
        product.description = row.description;
        product.price_normal = Number(row.price_normal) || 0;
        product.price_discount = Number(row.price_discount) || 0;
        product.stock = Number(row.stock) || 0;
        product.warranty = row.warranty;
        product.is_active = row.is_active === true || row.is_active === 'true';
        product.is_popular = row.is_popular === true || row.is_popular === 'true';
        product.category = category ?? null;

        const savedProduct = await this.productRepo.save(product);

        // Images
        await this.productImageRepo.delete({ product: { id: savedProduct.id } } as any);
        for (let i = 1; i <= 10; i++) {
          const imageUrl = row[`image_${i}`];
          if (imageUrl) {
            await this.productImageRepo.save({
              product: savedProduct,
              image_url: imageUrl,
              sort_order: i
            });
          }
        }

        totalUpdated++;
      } catch (err) {
        this.logger.error(`Error processing row ${idx + 1}: ${err.message}`, err.stack);
      }
    }

    return { message: 'Update selesai', total_updated: totalUpdated };
  }
}