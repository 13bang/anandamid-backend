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

@Injectable()
export class ProductService {
constructor(
@InjectRepository(Product)
private productRepository: Repository<Product>,

@InjectRepository(Category)
private categoryRepository: Repository<Category>,
) {}

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

qb.addSelect((subQuery) => {
  return subQuery
    .select('pi.image_url')
    .from('product_images', 'pi')
    .where('pi.product_id = product.id')
    .orderBy('pi.sort_order', 'ASC')
    .limit(1);
}, 'thumbnail_url');

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
    qb.orderBy('final_price_sort', 'ASC');
  } else if (sort === 'price_desc') {
    qb.orderBy('final_price_sort', 'DESC');
  } else {
    qb.orderBy('product.created_at', 'DESC')
      .addOrderBy('product.id', 'DESC');
  }
}

const countQb = qb.clone();

qb.skip((safePage - 1) * safeLimit).take(safeLimit);

const { raw, entities } = await qb.getRawAndEntities();
const total = await countQb.getCount();

const data = entities.map((product, index) => {
  const parsed = this.parseDescription(product.description);

  return {
    ...product,
    description_raw: parsed.description_raw,
    specifications: parsed.specifications,
    thumbnail_url: raw[index]?.thumbnail_url || null,
    is_duplicate: raw[index]?.is_duplicate_flag === true,
    duplicate_group: raw[index]?.is_duplicate_flag
      ? product.sku_seller
      : null,
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

  const parsed = this.parseDescription(product.description);

  return {
    ...product,
    ...parsed,
  };
}

async updateProductByParams(
id: string,
dto: UpdateProductDto,
): Promise<Product> {

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

return this.productRepository.save(product);
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
