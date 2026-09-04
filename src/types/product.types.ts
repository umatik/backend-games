export type Product = {
  id: string;
  name: string;
  price: number;
};

export type CreateProductData = Omit<Product, "id">;

export type UpdateProductData = Partial<CreateProductData>;
