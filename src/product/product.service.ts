import {
Injectable,
NotFoundException,
} from '@nestjs/common';

import { CreateProductDto } from './dto/create.product.dto';
import { UpdateProductDto } from './dto/update.product.dto';
import { Product } from './entities/product.entity';
import { Category } from '../category/entities/category.entity';
import { Brand } from 'src/brand/entities/brand.entity';
import { ProductImage } from 'src/product-image/entities/product-image.entity';

import { Repository, Brackets, In } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import sharp from 'sharp';
import crypto from "crypto";

@Injectable()
export class ProductService {
private ensureDirectories() {
  if (!fs.existsSync(this.originalPath)) {
    fs.mkdirSync(this.originalPath, { recursive: true });
  }

  if (!fs.existsSync(this.thumbPath)) {
    fs.mkdirSync(this.thumbPath, { recursive: true });
  }
}

private deleteFileIfExists(filePath?: string | null) {
  if (!filePath) return;

  // 🔥 hapus leading slash biar ga keluar dari root project
  const cleanPath = filePath.replace(/^\/+/, "");

  const fullPath = path.join(process.cwd(), cleanPath);

  if (fs.existsSync(fullPath)) {
    try {
      fs.unlinkSync(fullPath);
      console.log("Deleted:", fullPath);
    } catch (err) {
      console.error("Failed delete:", fullPath);
    }
  } else {
    console.warn("File not found:", fullPath);
  }
}

constructor(
  @InjectRepository(Product)
  private productRepository: Repository<Product>,

  @InjectRepository(Category)
  private categoryRepository: Repository<Category>,

  @InjectRepository(Brand)
  private brandRepository: Repository<Brand>,

  @InjectRepository(ProductImage)
    private productImageRepository: Repository<ProductImage>,
) {}

private uploadBasePath = path.join(process.cwd(), 'uploads', 'products');
private originalPath = path.join(this.uploadBasePath, 'original');
private thumbPath = path.join(this.uploadBasePath, 'thumbnails');

private async generateUniqueProductId(): Promise<string> {
  let productId: string;
  let exists: Product | null;

  do {
    const random = Math.floor(100000 + Math.random() * 900000);
    productId = `PRD-${random}`;

    exists = await this.productRepository.findOne({
      where: { product_id: productId },
    });

  } while (exists);

  return productId;
}   

private parseDescription(text: string | null) {
  if (!text) {
    return {
      description_raw: '',
      specifications: [],
    };
  }

  const normalized = text.replace(/\r\n/g, '\n');

  const lines = normalized
    .split('\n')
    .map(line => line.trim())
    .filter(line => line !== '');

  return {
    description_raw: text,
    specifications: lines,
  };
}

private async downloadAndReplace(image: any, createThumb = false) {

  const fileName = path.basename(image.image_url || "");
  const originalFile = path.join(this.originalPath, fileName);
  const thumbFile = path.join(this.thumbPath, fileName);

  if (
    image.image_url?.startsWith("/uploads") &&
    fs.existsSync(originalFile)
  ) {

    if (!fs.existsSync(thumbFile)) {

      await sharp(originalFile)
        .resize(300, 300, { fit: "inside" })
        .jpeg({ quality: 75 })
        .toFile(thumbFile);

      console.log("Thumbnail regenerated:", fileName);
    }

    image.thumbnail_url = `/uploads/products/thumbnails/${fileName}`;

    return;
  }

  // CASE 2: external image
  if (!image.image_url?.startsWith("http")) {
    return;
  }

  this.ensureDirectories();

  try {
    const response = await axios.get(image.image_url, {
      responseType: 'arraybuffer',
      timeout: 15000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.tiktok.com/',
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      },
    });

    if (!response.data || response.data.length < 100) {
      console.log("Invalid image:", image.image_url);
      return;
    }

    const ext = ".jpg";

    const hash = crypto
      .createHash("md5")
      .update(image.image_url)
      .digest("hex");

    const fileName = `${hash}${ext}`;

    const originalFile = path.join(this.originalPath, fileName);
    const thumbFile = path.join(this.thumbPath, fileName);

    if (fs.existsSync(originalFile) && fs.existsSync(thumbFile)) {

      image.image_url = `/uploads/products/original/${fileName}`;
      image.thumbnail_url = `/uploads/products/thumbnails/${fileName}`;

      return;
    }

    await sharp(response.data)
      .jpeg({ quality: 90 })
      .toFile(originalFile);

    if (createThumb) {
      await sharp(response.data)
        .resize(300, 300, { fit: 'inside' })
        .jpeg({ quality: 75 })
        .toFile(thumbFile);
    }

    image.image_url = `/uploads/products/original/${fileName}`;

    if (createThumb) {
      image.thumbnail_url = `/uploads/products/thumbnails/${fileName}`;
    } else {
      image.thumbnail_url = null;
    }

    

    console.log('Download sukses:', fileName);

  } catch (err: any) {
    console.log('Status:', err.response?.status);
    console.error('Download gagal:', image.image_url);
  }
}

async ensureImagesDownloaded(product: Product) {
  if (!product.images?.length) return;

  let updated = false;

  for (const img of product.images) {
    const before = img.thumbnail_url;

    const isMainImage = img.sort_order === 0;

    await this.downloadAndReplace(img, isMainImage);

    if (before !== img.thumbnail_url) {
      updated = true;
    }
  }

  if (updated) {
    await this.productRepository.save(product);
  }
}

async createProduct(dto: CreateProductDto) {

  const category = await this.categoryRepository.findOne({
    where: { id: dto.category_id },
  });

  if (!category) {
    throw new NotFoundException('Category not found');
  }

  let brand: Brand | null = null;

  if (dto.brand_id) {
    brand = await this.brandRepository.findOne({
      where: { id: dto.brand_id },
    });

    if (!brand) {
      throw new NotFoundException('Brand not found');
    }
  }

  // ======================
  // CEK DUPLICATE (SEBELUM SAVE)
  // ======================
  const duplicateSku = dto.sku_seller
    ? await this.productRepository.find({
        where: { sku_seller: dto.sku_seller },
      })
    : [];

  const duplicateName = dto.name
    ? await this.productRepository.find({
        where: { name: dto.name },
      })
    : [];

  const duplicateMap = new Map();

  [...duplicateSku, ...duplicateName].forEach((p) => {
    duplicateMap.set(p.id, p);
  });

  const duplicates = Array.from(duplicateMap.values());

  // ======================
  // SAVE PRODUCT (TETAP DISIMPAN)
  // ======================
  const productId = await this.generateUniqueProductId();

  const product = this.productRepository.create({
    ...dto,
    product_id: productId,
    category,
    brand, // 🔥 MASUKIN DI SINI
  });

  const savedProduct = await this.productRepository.save(product);

  // ======================
  // RESPONSE DENGAN WARNING
  // ======================
  return {
    product: savedProduct,
    duplicate_warning: duplicates.length > 0
      ? {
          message: "Duplicate detected",
          total: duplicates.length,
          duplicates: duplicates.map(p => ({
            id: p.id,
            name: p.name,
            sku_seller: p.sku_seller,
          })),
        }
      : null,
  };
}

async findAllProduct(query: any) {
const {
page = '1',
limit = '20',
no_limit,
search,
category,
brand,
sort,
is_popular,
is_active,
min_price,
max_price,
only_duplicate,
no_category,
category_ids,
grouping,
} = query;

const safeLimit = Number(limit) > 100 ? 100 : Number(limit);
const safePage = Number(page) < 1 ? 1 : Number(page);

const duplicateTotalRaw = await this.productRepository.query(`
  SELECT COUNT(*)
  FROM products
  WHERE sku_seller IS NOT NULL
  AND sku_seller <> ''
  AND sku_seller <> 'NaN'
  AND sku_seller IN (
    SELECT sku_seller
    FROM products
    WHERE sku_seller IS NOT NULL
    AND sku_seller <> ''
    AND sku_seller <> 'NaN'
    GROUP BY sku_seller
    HAVING COUNT(*) > 1
  );
`);

const duplicateTotal = Number(duplicateTotalRaw[0]?.count || 0);

const qb = this.productRepository
.createQueryBuilder('product')
.leftJoinAndSelect('product.category', 'category')
.leftJoinAndSelect('category.grouping', 'grouping')
.leftJoinAndSelect('product.brand', 'brand')

qb.leftJoin(
  'product.images',
  'thumbnail',
  'thumbnail.sort_order = 0'
);

qb.addSelect([
  'thumbnail.image_url',
  'thumbnail.thumbnail_url'
]);

qb.addOrderBy('thumbnail.sort_order', 'ASC');

// ======================
// DEFAULT LANDING FILTER
// ======================
if (is_active !== undefined) {
const isActiveParsed = is_active === 'true';

qb.andWhere('product.is_active = :is_active', {
is_active: isActiveParsed,
});
}

// ======================
// SEARCH
// ======================
if (search) {
  qb.andWhere('LOWER(product.name) LIKE LOWER(:search)', {
    search: `%${search}%`,
  });

  await this.productRepository
    .createQueryBuilder()
    .update(Product)
    .set({
      search_count: () => "search_count + 1",
    })
    .where("LOWER(name) LIKE LOWER(:search)", {
      search: `%${search}%`,
    })
    .execute();
  }

// ======================
// BRAND FILTER
// ======================
if (brand) {
  const brandIds = brand.split(",");

  qb.andWhere("brand.id IN (:...brandIds)", {
    brandIds,
  });
}

// ======================
// CATEGORY FILTER
// ======================
if (no_category === 'true') {
    qb.andWhere('product.category_id IS NULL');
  } else if (category) {
    qb.andWhere(
      new Brackets(qb2 => {
        qb2.where('LOWER(category.name) LIKE LOWER(:category)', {
          category: `%${category}%`,
        }).orWhere('category.code = :categoryExact', {
          categoryExact: category,
        });
      })
    );
  }

// ======================
// GROUPING FILTER
// ======================
if (grouping) {
  const categories = await this.categoryRepository.find({
    where: {
      grouping: {
        name: grouping, // bisa juga pakai id kalau mau lebih aman
      },
    },
    select: ["id"],
  });

  const ids = categories.map(c => c.id);

  // kalau kosong → paksa no result
  if (!ids.length) {
    qb.andWhere("1=0");
  } else {
    qb.andWhere("category.id IN (:...ids)", { ids });
  }
}

// ======================
// CATEGORY IDS FILTER 
// ======================
if (category_ids) {
  const ids = category_ids.split(",");

  qb.andWhere("category.id IN (:...ids)", {
    ids,
  });
}

// ======================
// POPULAR FILTER
// ======================
if (is_popular !== undefined) {
const isPopularParsed = is_popular === 'true';

qb.andWhere('product.is_popular = :is_popular', {
is_popular: isPopularParsed,
});
}

// ======================
// PRICE RANGE FILTER
// ======================
if (min_price !== undefined || max_price !== undefined) {
  qb.andWhere(
    `
    (product.price_normal - COALESCE(product.price_discount, 0))
    BETWEEN COALESCE(:min_price, 0)
    AND COALESCE(:max_price, 999999999)
    `,
    {
      min_price: min_price ? Number(min_price) : null,
      max_price: max_price ? Number(max_price) : null,
    },
  );
}

const seed = Math.floor(Date.now() / 10000);

// ======================
// SORTING
// ======================
qb.addSelect(
  'product.price_normal - COALESCE(product.price_discount, 0)',
  'final_price_sort',
);

qb.addSelect(`
  CASE 
    WHEN product.sku_seller IS NOT NULL
    AND product.sku_seller <> ''
    AND product.sku_seller <> 'NaN'
    AND product.sku_seller IN (
      SELECT sku_seller
      FROM products
      WHERE sku_seller IS NOT NULL
      AND sku_seller <> ''
      AND sku_seller <> 'NaN'
      GROUP BY sku_seller
      HAVING COUNT(*) > 1
    )
    THEN true
    ELSE false
  END
`, 'is_duplicate_flag');

qb.addSelect(
  `CASE WHEN product.stock IS NULL OR product.stock <= 0 THEN 1 ELSE 0 END`,
  'stock_order'
);

qb.addSelect(
  `MOD(abs(hashtext(product.id::text)), :seed)`,
  'random_order'
);

qb.addSelect(`
  (
    COALESCE(product.view_count, 0) * 0.7 +
    COALESCE(product.search_count, 0) * 0.3
  )
`, "recommend_score");

qb.setParameter('seed', seed);

if (only_duplicate === 'true') {

  qb.andWhere(`
    product.sku_seller IS NOT NULL
    AND product.sku_seller <> ''
    AND product.sku_seller <> 'NaN'
    AND product.sku_seller IN (
      SELECT sku_seller
      FROM products
      WHERE sku_seller IS NOT NULL
      AND sku_seller <> ''
      AND sku_seller <> 'NaN'
      GROUP BY sku_seller
      HAVING COUNT(*) > 1
    )
  `);

  qb.orderBy('stock_order', 'ASC')
    .addOrderBy('product.sku_seller', 'ASC')
    .addOrderBy('product.created_at', 'DESC');
} else {

  qb.orderBy('stock_order', 'ASC');

  if (sort === 'popular') {

    qb.addOrderBy('product.is_popular', 'DESC')
      .addOrderBy('product.stock', 'DESC')
      .addOrderBy('product.created_at', 'DESC');

  } 

  else if (sort === 'price_asc') {

    qb.addOrderBy('final_price_sort', 'ASC')
      .addOrderBy('product.stock', 'DESC')
      .addOrderBy('product.created_at', 'DESC');

  }

  else if (sort === 'price_desc') {

    qb.addOrderBy('final_price_sort', 'DESC')
      .addOrderBy('product.stock', 'DESC')
      .addOrderBy('product.created_at', 'DESC');

  }

  else if (sort === 'newest') {

    qb.addOrderBy('product.updated_at', 'DESC')
      .addOrderBy('product.created_at', 'DESC');

  }

  else if (sort === 'recommend') {
    qb.orderBy('stock_order', 'ASC')
      .addOrderBy('random_order', 'ASC') 
      .addOrderBy('recommend_score', 'DESC');
  }

  else {
      qb.orderBy('stock_order', 'ASC')
        .addOrderBy('random_order', 'ASC'); 
    }
}

const countQb = qb.clone();

if (no_limit !== 'true') {
  qb.skip((safePage - 1) * safeLimit).take(safeLimit);
}

const { raw, entities } = await qb.getRawAndEntities();
const total = await countQb.getCount();

// await Promise.all(
//   entities.map(product =>
//     this.ensureImagesDownloaded(product)
//   )
// );

const data = entities.map((product) => {
  const parsed = this.parseDescription(product.description);

  const rawRow = raw.find(r => r.product_id === product.id);

  const finalPrice =
    Number(product.price_normal || 0) -
    Number(product.price_discount || 0);

  return {
    ...product,

    final_price: finalPrice, 

    description_raw: parsed.description_raw,
    specifications: parsed.specifications,

    is_duplicate:
      rawRow?.is_duplicate_flag === true ||
      rawRow?.is_duplicate_flag === 'true',

    duplicate_group: product.sku_seller,
  };
});

  return {
    data,
    total,
    duplicateTotal,
    page: safePage,
    last_page: no_limit === 'true'
      ? 1
      : Math.ceil(total / safeLimit),
  };
}

async findOneByParams(id: string): Promise<any> {
  const product = await this.productRepository.findOne({
    where: { id },
    relations: ['category', 'images', 'brand'],
    order: {
      images: {
        sort_order: 'ASC',
      },
    },
  });

  if (!product) {
    throw new NotFoundException('Product not found');
  }

  await this.productRepository.increment(
    { id },
    "view_count",
    1
  );

  await this.ensureImagesDownloaded(product);

  const parsed = this.parseDescription(product.description);

  return {
    ...product,
    ...parsed,
  };
}

async updateProductByParams(
  id: string,
  dto: UpdateProductDto,
): Promise<any> {

  const product = await this.findOneByParams(id);

  if (dto.brand_id !== undefined) {
    if (dto.brand_id === null) {
      product.brand = null;
    } else {
      const brand = await this.brandRepository.findOne({
        where: { id: dto.brand_id },
      });

      if (!brand) {
        throw new NotFoundException('Brand not found');
      }

      product.brand = brand;
    }
  }

  if (dto.category_id) {
    const category = await this.categoryRepository.findOne({
      where: { id: dto.category_id },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    product.category = category;
  }

  Object.assign(product, dto);

  await this.productRepository.save(product);

  // 🔥 RELOAD FULL DATA WITH RELATIONS
  return this.findOneByParams(id);
}

async deleteProductByParams(id: string): Promise<void> {

  const product = await this.productRepository.findOne({
    where: { id },
    relations: ['images'],
  });

  if (!product) {
    throw new NotFoundException('Product not found');
  }

  for (const img of product.images) {

    this.deleteFileIfExists(img.image_url);
    this.deleteFileIfExists(img.thumbnail_url);

  }

  await this.productRepository.remove(product);
}

async findActiveProducts(query: any) {
return this.findAllProduct({
...query,
is_active: 'true',
});
}

async bulkDelete(ids: string[]): Promise<void> {

  if (!ids.length) return;

  const products = await this.productRepository.find({
    where: { id: In(ids) }, 
    relations: ['images'],
  });

  for (const product of products) {

    for (const img of product.images) {

      this.deleteFileIfExists(img.image_url);
      this.deleteFileIfExists(img.thumbnail_url);

    }

  }

  await this.productRepository.delete(ids);
}

async processSingleImage(imageUrl: string, sortOrder: number = 0) {
  if (!imageUrl) return null;

  // dummy object biar reuse logic lama
  const image: any = {
    image_url: imageUrl,
    sort_order: sortOrder,
  };

  await this.downloadAndReplace(image, sortOrder === 0);

  return {
    image_url: image.image_url,
    thumbnail_url: image.thumbnail_url,
  };
}

async getRecommendations(productId: string, limit = 10) {

  const currentProduct = await this.productRepository.findOne({
    where: { id: productId },
    relations: ['category'],
  });

  if (!currentProduct) {
    throw new NotFoundException('Product not found');
  }

  const seed = Math.floor(Date.now() / 10000);

  const qb = this.productRepository
    .createQueryBuilder('product')
    .leftJoinAndSelect('product.category', 'category')
    .leftJoinAndSelect('product.brand', 'brand') 
  
  qb.where('product.id != :id', { id: productId });

  // ======================
  // PRIORITAS 1: CATEGORY SAMA
  // ======================
  qb.addSelect(`
    CASE 
      WHEN product.category_id = :catId THEN 1
      ELSE 0
    END
  `, 'same_category');

  qb.setParameter('catId', currentProduct.category?.id || null);

  // ======================
  //  BRAND
  // ======================
  qb.addSelect(`
    CASE 
      WHEN product.brand_id = :brandId THEN 1
      ELSE 0
    END
  `, 'same_brand');

  qb.setParameter('brandId', currentProduct.brand?.id || null);

  // ======================
  // 🔥 SCORE GLOBAL (BIAR TETEP ADA TREND)
  // ======================
  qb.addSelect(`
    (
      COALESCE(product.view_count, 0) * 0.7 +
      COALESCE(product.search_count, 0) * 0.3
    )
  `, 'recommend_score');

  // ======================
  // RANDOM BIAR GA KAKU
  // ======================
  qb.addSelect(
    `MOD(abs(hashtext(product.id::text)), :seed)`,
    'random_order'
  );

qb.addSelect(`
  (
    (CASE WHEN product.brand_id = :brandId THEN 1 ELSE 0 END) * 0.5 +
    (CASE WHEN product.category_id = :catId THEN 1 ELSE 0 END) * 0.3 +
    (CASE WHEN LOWER(product.name) LIKE LOWER(:name) THEN 1 ELSE 0 END) * 0.1 +
    (
      COALESCE(product.view_count, 0) * 0.7 +
      COALESCE(product.search_count, 0) * 0.3
    ) * 0.2 +
    (RANDOM() * 0.1)
  )
`, 'final_score');

  qb.orderBy('final_score', 'DESC');

  qb.setParameter('seed', seed);

  // ======================
  // SORTING FINAL
  // ======================
  // qb.orderBy('same_category', 'DESC')   
  //   .addOrderBy('recommend_score', 'DESC')
  //   .addOrderBy('random_order', 'ASC');   

  qb.take(limit);

  const { entities } = await qb.getRawAndEntities();

  return entities;
}

async removeBrand(productId: string) {
  const product = await this.productRepository.findOne({
    where: { id: productId },
  });

  if (!product) {
    throw new NotFoundException("Product not found");
  }

  product.brand = null;

  await this.productRepository.save(product);

  return { message: "Brand removed from product" };
}

async getCompatibilityBuilder(query: {
  processor_id?: string;
  motherboard_id?: string;
  ram_id?: string;
}) {
  let requiredSocket: string | null = null;
  let requiredRamType: string | null = null;

  // ======================
  // 🔥 AMBIL SEMUA SEKALIGUS (biar efisien)
  // ======================
  const [cpu, mobo, ram] = await Promise.all([
    query.processor_id
      ? this.productRepository.findOne({ where: { id: query.processor_id } })
      : null,
    query.motherboard_id
      ? this.productRepository.findOne({ where: { id: query.motherboard_id } })
      : null,
    query.ram_id
      ? this.productRepository.findOne({ where: { id: query.ram_id } })
      : null,
  ]);

  // ======================
  // 🔥 NORMALIZE (biar ga case-sensitive bug)
  // ======================
  const normalize = (val?: string | null) =>
    val ? val.toLowerCase().trim() : null;

  const cpuSocket = normalize(cpu?.socket_type);
  const moboSocket = normalize(mobo?.socket_type);
  const moboRam = normalize(mobo?.ram_type);
  const ramType = normalize(ram?.ram_type);

  // ======================
  // 🔥 MERGE CONSTRAINT (INI KUNCI NYA)
  // ======================

  // SOCKET
  if (cpuSocket) requiredSocket = cpuSocket;
  if (moboSocket) requiredSocket = moboSocket;

  // RAM
  if (ramType) requiredRamType = ramType;
  if (moboRam) requiredRamType = moboRam;

  // ======================
  // 🔥 (OPTIONAL) DETECT CONFLICT
  // ======================
  if (cpuSocket && moboSocket && cpuSocket !== moboSocket) {
    return {
      active_constraints: {
        socket: "Tidak kompatibel",
        ram_type: requiredRamType || "Belum ditentukan",
      },
      available_processors: [],
      available_motherboards: [],
      available_rams: [],
    };
  }

  // ======================
  // 🔍 QUERY PROCESSOR
  // ======================
  const cpuQuery = this.productRepository
    .createQueryBuilder("product")
    .leftJoinAndSelect("product.category", "category")
    .where("LOWER(category.name) LIKE :cat", { cat: "%processor%" });

  if (requiredSocket) {
    cpuQuery.andWhere("LOWER(product.socket_type) = :socket", {
      socket: requiredSocket,
    });
  }

  const processors = await cpuQuery.getMany();

  // ======================
  // 🔍 QUERY MOTHERBOARD
  // ======================
  const moboQuery = this.productRepository
    .createQueryBuilder("product")
    .leftJoinAndSelect("product.category", "category")
    .where("LOWER(category.name) LIKE :cat", { cat: "%motherboard%" });

  if (requiredSocket) {
    moboQuery.andWhere("LOWER(product.socket_type) = :socket", {
      socket: requiredSocket,
    });
  }

  if (requiredRamType) {
    moboQuery.andWhere("LOWER(product.ram_type) = :ram", {
      ram: requiredRamType,
    });
  }

  const motherboards = await moboQuery.getMany();

  // ======================
  // 🔍 QUERY RAM
  // ======================
  const ramQuery = this.productRepository
    .createQueryBuilder("product")
    .leftJoinAndSelect("product.category", "category")
    .where("LOWER(category.name) LIKE :cat", { cat: "%ram%" });

  if (requiredRamType) {
    ramQuery.andWhere("LOWER(product.ram_type) = :ram", {
      ram: requiredRamType,
    });
  }

  const rams = await ramQuery.getMany();

  // ======================
  // ✅ RESULT
  // ======================
  return {
    active_constraints: {
      socket: requiredSocket || "Semua Socket",
      ram_type: requiredRamType || "Semua Tipe",
    },
    available_processors: processors,
    available_motherboards: motherboards,
    available_rams: rams,
  };
}

async deletePhysicalImage(filePath?: string | null) {
  if (!filePath) return;

  const fullPath = path.join(process.cwd(), filePath);

  if (fs.existsSync(fullPath)) {
    try {
      await fs.promises.unlink(fullPath);
      console.log("Deleted file:", fullPath);
    } catch (err) {
      console.error("Failed delete file:", fullPath);
    }
  }
}

  async deleteProductImage(imageId: string): Promise<void> {
    // 1. Cari gambar beserta relasi produknya
    const image = await this.productImageRepository.findOne({
      where: { id: imageId },
      relations: ['product'], // Kita butuh ID produk untuk mereset gambar lainnya
    });

    if (!image) {
      throw new NotFoundException('Image not found');
    }

    const productId = image.product.id;

    // 2. Hapus file fisik dari storage
    this.deleteFileIfExists(image.image_url);
    this.deleteFileIfExists(image.thumbnail_url);

    // 3. Hapus data gambar dari database
    await this.productImageRepository.remove(image);

    // ==========================================
    // 4. LOGIC RE-SEQUENCE SORT ORDER
    // ==========================================
    
    // Ambil semua gambar yang tersisa untuk produk tersebut, urutkan dari yang terkecil
    const remainingImages = await this.productImageRepository.find({
      where: { product: { id: productId } },
      order: { sort_order: 'ASC' },
    });

    // Jika masih ada gambar tersisa, reset urutannya mulai dari 0
    if (remainingImages.length > 0) {
      let hasChanges = false;

      for (let i = 0; i < remainingImages.length; i++) {
        // Jika sort_order saat ini tidak sesuai dengan index (misal 1 harusnya 0)
        if (remainingImages[i].sort_order !== i) {
          remainingImages[i].sort_order = i;
          hasChanges = true;
        }
      }

      // Jika ada perubahan urutan, simpan perubahannya ke database
      if (hasChanges) {
        await this.productImageRepository.save(remainingImages);
      }
    }
  }

}
