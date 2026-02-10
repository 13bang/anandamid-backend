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