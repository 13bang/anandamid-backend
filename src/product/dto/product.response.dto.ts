export class ProductResponseDto {
    id: string;
    name: string;
    normal_price: number;
    discount_price?: number;
    final_price: number;
}