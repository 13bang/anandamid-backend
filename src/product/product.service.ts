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

async createProduct(dto: CreateProductDto): Promise<Product> {

const category = await this.categoryRepository.findOne({
where: { id: dto.category_id },
});

if (!category) {
throw new NotFoundException('Category not found');
}

const product = this.productRepository.create({
...dto,
category,
});

return this.productRepository.save(product);
}

async findAllProduct(query: any) {
const {
page = '1',
limit = '10',
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
.leftJoinAndSelect('product.images', 'images');

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
qb.orderBy('final_price_sort', 'ASC');
} else if (sort === 'price_desc') {
qb.orderBy('final_price_sort', 'DESC');
} else {
qb.orderBy('product.created_at', 'DESC');
}

qb.skip((safePage - 1) * safeLimit).take(safeLimit);

const [data, total] = await qb.getManyAndCount();

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
}
