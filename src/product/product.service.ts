import {
Injectable,
NotFoundException,
} from '@nestjs/common';

import { CreateProductDto } from './dto/create.product.dto';
import { UpdateProductDto } from './dto/update.product.dto';
import { Product } from './entities/product.entity';
import { Category } from '../category/entities/category.entity';

import { Repository } from 'typeorm';
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

async createProduct(dto: CreateProductDto): Promise<Product> {
  try {
    console.log("CREATE DTO:", dto);

    const category = await this.categoryRepository.findOne({
      where: { id: dto.category_id },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const productId = await this.generateUniqueProductId();

    const product = this.productRepository.create({
      ...dto,
      product_id: productId,
      category,
    });

    return await this.productRepository.save(product);

  } catch (error) {
    console.error("CREATE PRODUCT ERROR:", error);
    throw error;
  }
}

async findAllProduct(query: any) {
const {
page = '1',
limit = '20',
search,
category,
sort,
is_popular,
is_active,
min_price,
max_price,
} = query;

const safeLimit = Number(limit) > 50 ? 50 : Number(limit);
const safePage = Number(page) < 1 ? 1 : Number(page);

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

if (sort === 'price_asc') {
  qb.orderBy('final_price_sort', 'ASC')
} else if (sort === 'price_desc') {
  qb.orderBy('final_price_sort', 'DESC')
} else {
  qb.orderBy('product.created_at', 'DESC')
    .addOrderBy('product.id', 'DESC')
}

qb.skip((safePage - 1) * safeLimit).take(safeLimit);

const { raw, entities } = await qb.getRawAndEntities();
const total = await qb.getCount();

const data = entities.map((product, index) => ({
  ...product,
  thumbnail_url: raw[index]?.thumbnail_url || null,
}));

return {
data,
total,
page: safePage,
last_page: Math.ceil(total / safeLimit),
};
}

async findOneByParams(id: string): Promise<Product> {
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

  return product;
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
