import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx-js-style';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Product } from '../product/entities/product.entity';
import { Category } from '../category/entities/category.entity';
import { ProductImage } from '../product-image/entities/product-image.entity';
import { Brand } from '../brand/entities/brand.entity';
import { randomUUID } from 'crypto';
import { ProductService } from 'src/product/product.service';
import { ProductImportProgressService } from './product-import-progress.service';

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

    @InjectRepository(Brand)
    private readonly brandRepo: Repository<Brand>,

    private readonly progressService: ProductImportProgressService,

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
      'id',
      'name','description','price_normal','price_discount','stock','sku_seller',
      'warranty','brand_name','category_name','category_code',
      'socket_type','ram_type', // <--- TAMBAHAN KOLOM BARU
      'is_active','is_popular',
      'image_1','image_2','image_3','image_4','image_5','image_6','image_7','image_8','image_9','image_10'
    ];

    const exampleRow1 = [
      randomUUID(), 
      'PRINTER CANON PIXMA G2010','Deskripsi produk disini...',2125000,100000,48,
      '1102127','Garansi Produsen','Canon','Printer & Scanner','830984',
      '','', 
      true,false,
      'https://example.com/image1.jpg','','','','','','','','',''
    ];

    const exampleRow2 = [
      randomUUID(), // Contoh random ID
      'MOTHERBOARD ASROCK H610M-HDV','Deskripsi mobo...',1100000,0,10,
      'MB-ASR-001','Garansi 3 Tahun','ASRock','Motherboard','MB001',
      'LGA 1700','DDR4', // socket_type dan ram_type terisi
      true,true,
      'https://example.com/mobo.jpg','','','','','','','','',''
    ];

    const productSheet = XLSX.utils.aoa_to_sheet([headers, exampleRow1, exampleRow2]);
    
    productSheet['!views'] = [{ state: 'frozen', ySplit: 1 }];

    headers.forEach((_, colIndex) => {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: colIndex });
      if (!productSheet[cellAddress]) return;

      productSheet[cellAddress].s = {
        font: { bold: true },
        fill: { fgColor: { rgb: "D9E1F2" } }
      };
    });

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
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, {
      defval: ""
    });

    const dbBrands = await this.brandRepo.find();
    const brandMap = new Map(dbBrands.map(b => [b.name.trim().toLowerCase(), b]));

    let totalCreated = 0;
    const errors: string[] = [];

    for (let idx = 0; idx < rows.length; idx++) {
      const row = rows[idx];

      // ==========================
      // KIRIM PROGRESS SSE
      // ==========================
      const progress = Math.round(((idx + 1) / rows.length) * 100);
      this.progressService.sendProgress(
        `Memproses upload: ${idx + 1} dari ${rows.length} produk`, 
        progress
      );

      try {
        if (idx % 50 === 0) {
          this.logger.log(`Processing upload row ${idx + 1}`);
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
        
        product.id = row.id || randomUUID();
        product.product_id = randomUUID();
        product.name = row.name;
        product.description = row.description;
        product.price_normal = Number(row.price_normal) || 0;
        product.price_discount = Number(row.price_discount) || 0;
        product.stock = Number(row.stock) || 0;
        product.sku_seller = row.sku_seller;
        product.warranty = row.warranty;
        
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

    // ==========================
    // FINAL PROGRESS (SELESAI)
    // ==========================
    this.progressService.sendProgress('Upload selesai!', 100);

    if (errors.length > 0) {
      throw new BadRequestException({ 
        message: 'Upload selesai dengan beberapa error', 
        total_error: errors.length, 
        errors,
        total_created: totalCreated 
      });
    }

    return { message: 'Upload selesai', total_created: totalCreated };
  }

  // ==========================
  // GENERATE TEMPLATE UPDATE
  // ==========================
  async generateUpdateTemplate(categoryCodes?: string[], onlyWithSku: boolean = true): Promise<Buffer> {
    const query = this.productRepo
      .createQueryBuilder("product")
      .leftJoinAndSelect("product.category", "category")
      .leftJoinAndSelect("product.brand", "brand")
      .leftJoinAndSelect("product.images", "images")
      .orderBy("product.name", "ASC");

    if (categoryCodes && categoryCodes.length > 0) {
      query.andWhere("category.code IN (:...codes)", { codes: categoryCodes });
    }

    // Filter SKU Seller
    if (onlyWithSku) {
      query
        .andWhere("product.sku_seller IS NOT NULL")
        .andWhere("TRIM(product.sku_seller) != ''")
        .andWhere("LOWER(TRIM(product.sku_seller)) != 'nan'");
    }

    const products = await query.getMany();

    const hardwareKeywords = ['ram', 'memory', 'motherboard', 'mobo', 'processor', 'cpu'];
    const includeHardwareCols = products.some(p => {
      const catName = (p.category?.name || '').toLowerCase();
      return hardwareKeywords.some(keyword => catName.includes(keyword));
    });

    const headers = [
      'id',
      'name', 'description', 'price_normal', 'price_discount', 'stock', 'sku_seller',
      'warranty', 'brand_name', 'category_name', 'category_code'
    ];

    if (includeHardwareCols) {
      headers.push('socket_type', 'ram_type');
    }

    headers.push(
      'is_active', 'is_popular',
      'image_1', 'image_2', 'image_3', 'image_4', 'image_5', 
      'image_6', 'image_7', 'image_8', 'image_9', 'image_10'
    );

    const rows = products.map(product => {
      const images = Array(10).fill("");

      if (product.images?.length) {
        product.images.forEach(img => {
          if (img.sort_order >= 0 && img.sort_order <= 9) {
            images[img.sort_order] = img.image_url;
          }
        });
      }

      const clean = (val: any) => {
        if (val === null || val === undefined) return '';
        const str = String(val).trim().toLowerCase();
        if (str === 'nan') return '';
        return val;
      };

      const rowData = [
        product.id,
        product.name,
        product.description,
        product.price_normal,
        product.price_discount,
        product.stock,
        clean(product.sku_seller),
        product.warranty,
        product.brand?.name || '',
        product.category?.name,
        product.category?.code
      ];

      if (includeHardwareCols) {
        rowData.push(product.socket_type || '', product.ram_type || '');
      }

      rowData.push(
        product.is_active,
        product.is_popular,
        ...images
      );

      return rowData;
    });

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    
    const borderStyle = {
      top: { style: "thin", color: { rgb: "000000" } },
      bottom: { style: "thin", color: { rgb: "000000" } },
      left: { style: "thin", color: { rgb: "000000" } },
      right: { style: "thin", color: { rgb: "000000" } },
    };
    
    worksheet['!views'] = [{ state: 'frozen', ySplit: 1 }];
    headers.forEach((_, colIndex) => {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: colIndex });
      if (!worksheet[cellAddress]) return;

      worksheet[cellAddress].s = {
        font: { bold: true },
        fill: { fgColor: { rgb: "D9E1F2" } },
        border: borderStyle
      };
    });

    const range = XLSX.utils.decode_range(worksheet['!ref'] || '');

    for (let R = 1; R <= range.e.r; ++R) {
      for (let C = 0; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        let cell = worksheet[cellAddress];

        if (!cell) {
          cell = { v: '', t: 's' };
        }

        const isEmpty =
          cell.v === '' ||
          cell.v === null ||
          String(cell.v).toLowerCase() === 'nan';

        worksheet[cellAddress] = {
          ...cell,
          s: {
            ...(cell.s || {}),
            fill: isEmpty
              ? { fgColor: { rgb: "FFFFCC" } }
              : undefined,
            border: borderStyle
          }
        };
      }
    }
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
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, {
      defval: ""
    });
    
    const categories = await this.categoryRepo.find();
    const categoryMap = new Map(categories.map(c => [String(c.code).trim(), c]));

    const dbBrands = await this.brandRepo.find();
    const brandMap = new Map(dbBrands.map(b => [String(b.name).trim().toLowerCase(), b]));

    const ids = rows.map(r => r.id).filter(Boolean);

    const products = await this.productRepo.find({
      where: { id: In(ids) },
      relations: ['images', 'category', 'brand']
    });

    const productMap = new Map(products.map(p => [p.id, p]));

    const normalize = (val: any) => String(val ?? '').trim();
    const normalizeLower = (val: any) => normalize(val).toLowerCase();

    let totalUpdated = 0;
    const errors: string[] = [];

    for (let idx = 0; idx < rows.length; idx++) {
      const row = rows[idx];

      try {
        if (idx % 50 === 0) {
          this.logger.log(`Processing update row ${idx + 1}`);
        }

        const excelId = row.id;
        if (!excelId) throw new BadRequestException(`Row ${idx + 1}: ID wajib diisi`);

        let product = productMap.get(excelId);
        if (!product) throw new BadRequestException(`Row ${idx + 1}: Product dengan ID ${excelId} tidak ditemukan`);

        // ==========================
        // VALIDASI CATEGORY
        // ==========================
        const excelCategoryCode = row.category_code ? normalize(row.category_code) : null;

        if (excelCategoryCode) {
          const category = categoryMap.get(excelCategoryCode);

          if (!category) {
            throw new BadRequestException(`Row ${idx + 1}: Category code ${excelCategoryCode} tidak ditemukan`);
          }

          if (row.category_name) {
            const excelCategoryName = normalizeLower(row.category_name);
            const dbCategoryName = normalizeLower(category.name);

            if (dbCategoryName !== excelCategoryName) {
              throw new BadRequestException(`Row ${idx + 1}: Category name tidak cocok untuk code ${excelCategoryCode}`);
            }
          }

          product.category = category;
        }

        // ==========================
        // VALIDASI BRAND
        // ==========================
        const excelBrandName = row.brand_name ? normalizeLower(row.brand_name) : null;

        if (excelBrandName) {
          const productBrand = brandMap.get(excelBrandName);

          if (!productBrand) {
            throw new BadRequestException(`Row ${idx + 1}: Brand '${row.brand_name}' tidak ditemukan`);
          }

          product.brand = productBrand;
        }

        // ==========================
        // UPDATE DATA
        // ==========================
        if (row.name !== undefined) product.name = row.name;
        if (row.description !== undefined) product.description = row.description;
        if (row.price_normal !== undefined) product.price_normal = Number(row.price_normal) || 0;
        if (row.price_discount !== undefined) product.price_discount = Number(row.price_discount) || 0;
        if (row.stock !== undefined) product.stock = Number(row.stock) || 0;
        if (row.warranty !== undefined) product.warranty = row.warranty;

        if (row.sku_seller !== undefined) {
          product.sku_seller = row.sku_seller ? String(row.sku_seller).trim() : null;
        }

        if (row.socket_type !== undefined) {
          product.socket_type = row.socket_type ? String(row.socket_type).trim() : null;
        }

        if (row.ram_type !== undefined) {
          product.ram_type = row.ram_type ? String(row.ram_type).trim() : null;
        }

        if (row.is_active !== undefined) {
          product.is_active = row.is_active === true || row.is_active === 'true';
        }

        if (row.is_popular !== undefined) {
          product.is_popular = row.is_popular === true || row.is_popular === 'true';
        }

        await this.productRepo.save(product);
        totalUpdated++;

        // ==========================
        // HANDLE IMAGES
        // ==========================
        const existingImages = await this.productImageRepo.find({
          where: { product: { id: product.id } }
        });

        const imageMap = new Map(existingImages.map(img => [img.sort_order, img]));

        for (let i = 1; i <= 10; i++) {
          const sortOrder = i - 1;
          const excelImageUrl = row[`image_${i}`];

          if (excelImageUrl !== undefined) {
            const rawUrl = excelImageUrl ? String(excelImageUrl).trim() : "";
            const existingImg = imageMap.get(sortOrder);

            if (rawUrl.startsWith("http")) {
              try {
                const oldImagePath = existingImg?.image_url;
                const oldThumbPath = existingImg?.thumbnail_url;

                const processed = await this.productService.processSingleImage(rawUrl, sortOrder);

                if (processed) {
                  if (existingImg) {
                    if (oldImagePath && oldImagePath !== processed.image_url) {
                      await this.productService.deletePhysicalImage(oldImagePath);
                    }
                    if (oldThumbPath && oldThumbPath !== processed.thumbnail_url) {
                      await this.productService.deletePhysicalImage(oldThumbPath);
                    }

                    existingImg.image_url = processed.image_url;
                    existingImg.thumbnail_url = processed.thumbnail_url;
                    await this.productImageRepo.save(existingImg);
                  } else {
                    await this.productImageRepo.save({
                      product,
                      image_url: processed.image_url,
                      thumbnail_url: processed.thumbnail_url,
                      sort_order: sortOrder,
                    });
                  }
                }
              } catch (imgErr: any) {
                this.logger.error(`Gagal memproses gambar ${rawUrl}`, imgErr.stack);
              }
            } 
            else if (rawUrl === "" && existingImg) {
              await this.productService.deletePhysicalImage(existingImg.image_url);
              await this.productService.deletePhysicalImage(existingImg.thumbnail_url);
              await this.productImageRepo.delete(existingImg.id);
            }
          }
        }

      } catch (err: any) {
        errors.push(err.message);
      }
    }

    this.progressService.sendProgress('Selesai!', 100);

    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Update selesai dengan beberapa error',
        total_error: errors.length,
        errors,
      });
    }

    return { message: 'Update selesai', total_updated: totalUpdated };
  }
}