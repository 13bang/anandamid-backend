import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Product } from '../product/entities/product.entity';
import { Category } from '../category/entities/category.entity';
import { ProductImage } from '../product-image/entities/product-image.entity';
import { Brand } from '../brand/entities/brand.entity';
import { randomUUID } from 'crypto';
import { Subject } from 'rxjs';
import { ProductService } from 'src/product/product.service';

import * as crypto from "crypto";

@Injectable()
export class ProductImportService {
  progress$ = new Subject<{ message: string; percent: number }>();

  private readonly logger = new Logger(ProductImportService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,

    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,

    @InjectRepository(ProductImage)
    private readonly productImageRepo: Repository<ProductImage>,

    @InjectRepository(Brand)
    private readonly brandRepo: Repository<Brand>,

    private readonly productService: ProductService,
  ) {}

  // Helper untuk mengambil list Socket & RAM unik dari DB
  private async getDistinctTypes() {
    const rawSockets = await this.productRepo
      .createQueryBuilder("product")
      .select("product.socket_type", "val")
      .distinct(true)
      .where("product.socket_type IS NOT NULL")
      .andWhere("product.socket_type != ''")
      .getRawMany();
    
    const rawRams = await this.productRepo
      .createQueryBuilder("product")
      .select("product.ram_type", "val")
      .distinct(true)
      .where("product.ram_type IS NOT NULL")
      .andWhere("product.ram_type != ''")
      .getRawMany();

    return {
      sockets: rawSockets.map(r => r.val),
      rams: rawRams.map(r => r.val)
    };
  }

  // ==========================
  // GENERATE TEMPLATE UPLOAD
  // ==========================
  async generateTemplate(): Promise<Buffer> {
    const headers = [
      'name','description','price_normal','price_discount','stock','sku_seller',
      'warranty','brand_name','category_name','category_code',
      'socket_type','ram_type', // <--- TAMBAHAN KOLOM BARU
      'is_active','is_popular',
      'image_1','image_2','image_3','image_4','image_5','image_6','image_7','image_8','image_9','image_10'
    ];

    // Saya buat 2 contoh: Printer (tanpa socket/ram) dan Motherboard (dengan socket/ram)
    const exampleRow1 = [
      'PRINTER CANON PIXMA G2010','Deskripsi produk disini...',2125000,100000,48,
      '1102127','Garansi Produsen','Canon','Printer & Scanner','830984',
      '','', // socket_type, ram_type kosong
      true,false,
      'https://example.com/image1.jpg','','','','','','','','',''
    ];

    const exampleRow2 = [
      'MOTHERBOARD ASROCK H610M-HDV','Deskripsi mobo...',1100000,0,10,
      'MB-ASR-001','Garansi 3 Tahun','ASRock','Motherboard','MB001',
      'LGA 1700','DDR4', // socket_type dan ram_type terisi
      true,true,
      'https://example.com/mobo.jpg','','','','','','','','',''
    ];

    const productSheet = XLSX.utils.aoa_to_sheet([headers, exampleRow1, exampleRow2]);

    // ===== CATEGORY SHEET =====
    const categories = await this.categoryRepo.find({ order: { name: "ASC" } });
    const categorySheet = XLSX.utils.aoa_to_sheet([
      ["category_name", "category_code"],
      ...categories.map(c => [c.name, c.code])
    ]);

    // ===== BRAND SHEET =====
    const brands = await this.brandRepo.find({ order: { name: "ASC" } });
    const brandSheet = XLSX.utils.aoa_to_sheet([
      ["brand_name"],
      ...brands.map(b => [b.name])
    ]);

    // ===== SOCKET & RAM SHEET (DATA UNIK DARI DB) =====
    const { sockets, rams } = await this.getDistinctTypes();
    
    // Jika db masih kosong, beri contoh data sementara
    const finalSockets = sockets.length > 0 ? sockets : ['LGA 1700', 'AM4', 'AM5'];
    const finalRams = rams.length > 0 ? rams : ['DDR4', 'DDR5'];

    const socketSheet = XLSX.utils.aoa_to_sheet([["socket_type"], ...finalSockets.map(s => [s])]);
    const ramSheet = XLSX.utils.aoa_to_sheet([["ram_type"], ...finalRams.map(r => [r])]);

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, productSheet, "Products");
    XLSX.utils.book_append_sheet(workbook, categorySheet, "Categories");
    XLSX.utils.book_append_sheet(workbook, brandSheet, "Brands");
    XLSX.utils.book_append_sheet(workbook, socketSheet, "Socket Type"); 
    XLSX.utils.book_append_sheet(workbook, ramSheet, "RAM Type");    

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  // ==========================
  // UPLOAD PRODUCT BARU
  // ==========================
  async uploadProducts(buffer: Buffer) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet);
    const totalRows = rows.length;

    const dbBrands = await this.brandRepo.find();
    const brandMap = new Map(dbBrands.map(b => [b.name.trim().toLowerCase(), b]));

    let totalCreated = 0;
    const errors: string[] = [];

    for (let idx = 0; idx < rows.length; idx++) {
      const row = rows[idx];

      try {
        const percent = Math.floor(((idx + 1) / totalRows) * 100);

        if (idx % 50 === 0) {
          const msg = `Processing row ${idx + 1}`;
          this.logger.log(msg);
          this.progress$.next({ message: msg, percent });
        }

        if (!row.sku_seller) throw new BadRequestException(`Row ${idx + 1}: SKU seller wajib diisi`);
        if (!row.category_code) throw new BadRequestException(`Row ${idx + 1}: Category code wajib diisi`);

        const category = await this.categoryRepo.findOne({ where: { code: row.category_code } });
        if (!category) throw new BadRequestException(`Row ${idx + 1}: Category code ${row.category_code} tidak ditemukan`);

        if (row.category_name && category.name.trim().toLowerCase() !== String(row.category_name).trim().toLowerCase()) {
          throw new BadRequestException(`Row ${idx + 1}: Category name tidak cocok untuk code ${row.category_code}`);
        }

        let productBrand: Brand | null = null;
        if (row.brand_name) {
          productBrand = brandMap.get(String(row.brand_name).trim().toLowerCase()) || null;
          if (!productBrand) {
            throw new BadRequestException(`Row ${idx + 1}: Brand dengan nama '${row.brand_name}' tidak ditemukan di database`);
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
        
        // <--- ASSIGN SOCKET DAN RAM --->
        product.socket_type = row.socket_type ? String(row.socket_type).trim() : null;
        product.ram_type = row.ram_type ? String(row.ram_type).trim() : null;

        product.is_active = row.is_active === true || row.is_active === 'true';
        product.is_popular = row.is_popular === true || row.is_popular === 'true';
        product.category = category;
        
        if (productBrand) product.brand = productBrand;

        const savedProduct = await this.productRepo.save(product);

        for (let i = 1; i <= 10; i++) {
          const imageUrl = row[`image_${i}`];
          if (imageUrl) {
            const processed = await this.productService.processSingleImage(imageUrl, i - 1);
            await this.productImageRepo.save({
              product: savedProduct,
              image_url: processed?.image_url,
              thumbnail_url: processed?.thumbnail_url,
              sort_order: i - 1,
            });
          }
        }

        totalCreated++;
      } catch (err: any) {
        errors.push(err.message);
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException({ message: 'Upload gagal', total_error: errors.length, errors });
    }

    this.progress$.next({ message: "Upload selesai", percent: 100 });
    return { message: 'Upload selesai', total_created: totalCreated };
  }

  // ==========================
  // GENERATE TEMPLATE UPDATE
  // ==========================
  async generateUpdateTemplate(categoryCodes?: string[]): Promise<Buffer> {
    const headers = [
      'name','description','price_normal','price_discount','stock','sku_seller',
      'warranty','brand_name','category_name','category_code',
      'socket_type','ram_type', // <--- TAMBAHAN KOLOM BARU
      'is_active','is_popular',
      'image_1','image_2','image_3','image_4','image_5','image_6','image_7','image_8','image_9','image_10'
    ];

    const query = this.productRepo
      .createQueryBuilder("product")
      .leftJoinAndSelect("product.category", "category")
      .leftJoinAndSelect("product.brand", "brand")
      .leftJoinAndSelect("product.images", "images")
      .orderBy("product.name", "ASC");

    if (categoryCodes && categoryCodes.length > 0) {
      query.andWhere("category.code IN (:...codes)", { codes: categoryCodes });
    }

    const products = await query.getMany();

    const rows = products.map(product => {
      const images = Array(10).fill("");
      if (product.images?.length) {
        product.images.forEach(img => {
          if (img.sort_order >= 0 && img.sort_order <= 9) {
            images[img.sort_order] = img.image_url;
          }
        });
      }

      return [
        product.name,
        product.description,
        product.price_normal,
        product.price_discount,
        product.stock,
        product.sku_seller,
        product.warranty,
        product.brand?.name || '',
        product.category?.name,
        product.category?.code,

        product.socket_type || '', // <--- MAPPING DATA DB KE EXCEL
        product.ram_type || '',    // <--- MAPPING DATA DB KE EXCEL

        product.is_active,
        product.is_popular,
        ...images
      ];
    });

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Products");

    // ===== CATEGORIES =====
    const categories = await this.categoryRepo.find({ order: { name: "ASC" } });
    const categorySheet = XLSX.utils.aoa_to_sheet([
      ["category_name", "category_code"],
      ...categories.map(c => [c.name, c.code])
    ]);
    XLSX.utils.book_append_sheet(workbook, categorySheet, "Categories");

    // ===== BRANDS =====
    const brands = await this.brandRepo.find({ order: { name: "ASC" } });
    const brandSheet = XLSX.utils.aoa_to_sheet([
      ["brand_name"],
      ...brands.map(b => [b.name])
    ]);
    XLSX.utils.book_append_sheet(workbook, brandSheet, "Brands");

    // ===== SOCKET & RAM (DATA UNIK DARI DB) =====
    const { sockets, rams } = await this.getDistinctTypes();
    const finalSockets = sockets.length > 0 ? sockets : ['LGA 1700', 'AM4', 'AM5'];
    const finalRams = rams.length > 0 ? rams : ['DDR4', 'DDR5'];

    const socketSheet = XLSX.utils.aoa_to_sheet([["socket_type"], ...finalSockets.map(s => [s])]);
    const ramSheet = XLSX.utils.aoa_to_sheet([["ram_type"], ...finalRams.map(r => [r])]);

    XLSX.utils.book_append_sheet(workbook, socketSheet, "Socket Types");
    XLSX.utils.book_append_sheet(workbook, ramSheet, "RAM Types");

    return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  }

  // ==========================
  // UPDATE PRODUCTS
  // ==========================
  async updateProducts(buffer: Buffer) {
    this.progress$.next({ message: "Reading Excel file...", percent: 0 });

    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet);
    const totalRows = rows.length;
    
    const categories = await this.categoryRepo.find();
    const categoryMap = new Map(categories.map(c => [String(c.code).trim(), c]));

    const dbBrands = await this.brandRepo.find();
    const brandMap = new Map(dbBrands.map(b => [String(b.name).trim().toLowerCase(), b]));

    const skus = rows.map(r => r.sku_seller ? String(r.sku_seller).trim() : null).filter(Boolean);

    const products = await this.productRepo.find({
      where: { sku_seller: In(skus) },
      relations: ['images', 'category', 'brand']
    });

    const productMap = new Map(products.map(p => [String(p.sku_seller).trim(), p]));

    let totalUpdated = 0;
    const errors: string[] = [];

    for (let idx = 0; idx < rows.length; idx++) {
      const row = rows[idx];

      try {
        const percent = Math.floor(((idx + 1) / totalRows) * 100);
        if (idx % 50 === 0) {
          this.progress$.next({ message: `Processing row ${idx + 1}`, percent });
        }

        const excelSku = row.sku_seller ? String(row.sku_seller).trim() : null;
        if (!excelSku) throw new BadRequestException(`Row ${idx + 1}: SKU seller wajib diisi`);

        let product = productMap.get(excelSku);
        if (!product) throw new BadRequestException(`Row ${idx + 1}: Product dengan SKU ${excelSku} tidak ditemukan`);

        // 1. VALIDASI KATEGORI
        const excelCategoryCode = row.category_code ? String(row.category_code).trim() : null;
        if (excelCategoryCode) {
          const category = categoryMap.get(excelCategoryCode);
          if (!category) throw new BadRequestException(`Row ${idx + 1}: Category code ${excelCategoryCode} tidak ditemukan`);
          
          if (row.category_name && category.name.trim().toLowerCase() !== String(row.category_name).trim().toLowerCase()) {
            throw new BadRequestException(`Row ${idx + 1}: Category name tidak cocok untuk code ${excelCategoryCode}`);
          }
          product.category = category;
        }

        // 2. VALIDASI BRAND
        const excelBrandName = row.brand_name ? String(row.brand_name).trim().toLowerCase() : null;
        if (excelBrandName) {
          const productBrand = brandMap.get(excelBrandName);
          if (!productBrand) throw new BadRequestException(`Row ${idx + 1}: Brand '${row.brand_name}' tidak ditemukan`);
          product.brand = productBrand;
        }

        // 3. ASSIGN DATA LAINNYA
        if (row.name !== undefined) product.name = row.name;
        if (row.description !== undefined) product.description = row.description;
        if (row.price_normal !== undefined) product.price_normal = Number(row.price_normal) || 0;
        if (row.price_discount !== undefined) product.price_discount = Number(row.price_discount) || 0;
        if (row.stock !== undefined) product.stock = Number(row.stock) || 0;
        if (row.warranty !== undefined) product.warranty = row.warranty;
        
        // <--- UPDATE SOCKET & RAM --->
        // Pakai `!== undefined` agar user bisa mengosongkan nilai di Excel dengan cara menghapus isi sel-nya
        if (row.socket_type !== undefined) product.socket_type = row.socket_type ? String(row.socket_type).trim() : null;
        if (row.ram_type !== undefined) product.ram_type = row.ram_type ? String(row.ram_type).trim() : null;

        if (row.is_active !== undefined) product.is_active = row.is_active === true || row.is_active === 'true';
        if (row.is_popular !== undefined) product.is_popular = row.is_popular === true || row.is_popular === 'true';

        // 4. SAVE KE DATABASE
        await this.productRepo.save(product); 
        totalUpdated++;

      } catch (err: any) {
        errors.push(err.message);
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Update selesai dengan beberapa error',
        total_error: errors.length,
        errors,
      });
    }

    this.progress$.next({ message: "Update selesai", percent: 100 });
    return { message: 'Update selesai', total_updated: totalUpdated };
  }
}