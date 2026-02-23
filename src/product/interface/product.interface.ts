import { Product } from '../entities/product.entity';
export interface IProduct{
    id:string,
    title:string,
    content:string,
    status:ProductStatus
}

export enum ProductStatus{
    SUCCESS = 'SUCCESS',
    PENDING = 'PENDING',
    FAILED = 'FAILED'
}

export interface CreateProductResponse {
  product: Product;
  duplicate_warning: {
    message: string;
    total: number;
    duplicates: {
      id: string;
      name: string;
      sku_seller: string;
    }[];
  } | null;
}