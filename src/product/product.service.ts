import {
Injectable,
NotFoundException,
} from '@nestjs/common';

import { CreateProductDto } from './dto/create.product.dto';
import { UpdateProductDto } from './dto/update.product.dto';
import { Product } from './entities/product.entity';
import { Category } from '../category/entities/category.entity';

import { Repository, Brackets } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import sharp from 'sharp';

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

constructor(
  @InjectRepository(Product)
  private productRepository: Repository<Product>,

  @InjectRepository(Category)
  private categoryRepository: Repository<Category>,
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

private parseDescription(text: string) {
  if (!text) {
    return {
      description_raw: '',
      specifications: [],
    };
  }

  // normalisasi newline
  const normalized = text.replace(/\r\n/g, '\n');

  // split per baris
  const lines = normalized
    .split('\n')
    .map(line => line.trim())
    .filter(line => line !== '');

  return {
    description_raw: text,
    specifications: lines,
  };
}

private async downloadAndReplace(image: any) {
  if (!image.image_url?.startsWith('http')) {
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

    const ext = '.jpg'; // paksa jpg biar aman
    const fileName = `${image.id}${ext}`;

    const originalFile = path.join(this.originalPath, fileName);
    const thumbFile = path.join(this.thumbPath, fileName);

    fs.writeFileSync(originalFile, response.data);

    await sharp(response.data)
      .resize(300, 300, { fit: 'inside' })
      .jpeg({ quality: 75 })
      .toFile(thumbFile);

    image.image_url = `/uploads/products/original/${fileName}`;
    image.thumbnail_url = `/uploads/products/thumbnails/${fileName}`;

    await this.productRepository.manager.save(image);

    console.log('Download sukses:', fileName);

  } catch (err: any) {
    console.log('Status:', err.response?.status);
    console.error('Download gagal:', image.image_url);
  }
}

private async ensureImagesDownloaded(product: Product) {
  if (!product.images?.length) return;

  for (const img of product.images) {
    await this.downloadAndReplace(img);
  }
}

async createProduct(dto: CreateProductDto) {

  const category = await this.categoryRepository.findOne({
    where: { id: dto.category_id },
  });

  if (!category) {
    throw new NotFoundException('Category not found');
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
search,
category,
parent,
brand,
sort,
is_popular,
is_active,
min_price,
max_price,
only_duplicate,
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

const qb = this.productRepository
.createQueryBuilder('product')
.leftJoinAndSelect('product.category', 'category')

qb.leftJoinAndSelect(
  'product.images',
  'images'
);

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
}

// ======================
// BRAND FILTER (multi match anywhere in name)
// ======================
if (brand) {
  const brands = brand.split(",");

  qb.andWhere(
    new Brackets((qb2) => {
      brands.forEach((b, index) => {
        qb2.orWhere(`LOWER(product.name) LIKE LOWER(:brand${index})`, {
          [`brand${index}`]: `%${b}%`,
        });
      });
    })
  );
}

// ======================
// CATEGORY FILTER
// ======================
if (category) {
qb.andWhere('LOWER(category.name) LIKE LOWER(:category)', {
category: `%${category}%`,
});
}

// ======================
// PARENT CATEGORY FILTER
// ======================
if (parent) {
  const parentCategory = await this.categoryRepository.findOne({
    where: { code: parent },
    relations: ['children'],
  });

  if (parentCategory) {
    const categoryIds = parentCategory.children.map(c => c.id);

    // kalau parent juga punya produk langsung
    categoryIds.push(parentCategory.id);

    qb.andWhere('category.id IN (:...categoryIds)', {
      categoryIds,
    });
  }
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

  qb.orderBy('product.sku_seller', 'ASC')
    .addOrderBy('product.created_at', 'DESC');

} else {
  if (sort === 'price_asc') {
    qb.orderBy('product.stock', 'DESC')
      .addOrderBy('final_price_sort', 'ASC')
      .addOrderBy('product.price_discount', 'DESC')
      .addOrderBy('product.created_at', 'DESC');

  } else if (sort === 'price_desc') {
    qb.orderBy('product.stock', 'DESC')
      .addOrderBy('final_price_sort', 'DESC')
      .addOrderBy('product.price_discount', 'DESC')
      .addOrderBy('product.created_at', 'DESC');

  } else {
    qb.orderBy('product.stock', 'DESC')
      .addOrderBy('product.price_discount', 'DESC')
      .addOrderBy('product.created_at', 'DESC');
  }
}

const countQb = qb.clone();

qb.skip((safePage - 1) * safeLimit).take(safeLimit);

const { raw, entities } = await qb.getRawAndEntities();
const total = await countQb.getCount();

await Promise.all(
  entities.map(product =>
    this.ensureImagesDownloaded(product)
  )
);

const data = entities.map((product) => {
  const parsed = this.parseDescription(product.description);

  const thumbnail =
    product.images?.find(img => img.sort_order === 0);

  return {
    ...product,
    description_raw: parsed.description_raw,
    specifications: parsed.specifications,
    thumbnail_url: thumbnail?.thumbnail_url || null,
    is_duplicate: false,
    duplicate_group: null,
  };
});

return {
data,
total,
duplicateTotal: Number(duplicateTotalRaw[0]?.count || 0),
page: safePage,
last_page: Math.ceil(total / safeLimit),
};
}

async findOneByParams(id: string): Promise<any> {
  const product = await this.productRepository.findOne({
    where: { id },
    relations: ['category', 'images'],
    order: {
      images: {
        sort_order: 'ASC',
      },
    },
  });

  if (!product) {
    throw new NotFoundException('Product not found');
  }

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
const product = await this.findOneByParams(id);
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

  await this.productRepository.delete(ids);
}

}
