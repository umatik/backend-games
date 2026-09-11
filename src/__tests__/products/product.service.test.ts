import { beforeEach, describe, jest, it, expect } from "@jest/globals";
import type { PoolClient } from "pg";
import {
  type Database,
  ProductService,
} from "../../services/product.service.js";
import type { ProductRepository } from "../../repositories/product/product.interface.js";
import type { ProductVariantRepository } from "../../repositories/product-variant/product-variant.interface.js";

const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};

describe("ProductService", () => {
  let productService: ProductService;
  let productRepository: jest.Mocked<ProductRepository>;
  let productVariantRepository: jest.Mocked<ProductVariantRepository>;
  let mockPool: Database;

  beforeEach(() => {
    jest.clearAllMocks();

    productRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    productVariantRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByProductId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    mockPool = {
      connect: jest
        .fn<() => Promise<PoolClient>>()
        .mockResolvedValue(mockClient as unknown as PoolClient),
    };

    productService = new ProductService(
      productRepository,
      productVariantRepository,
      mockPool,
    );
  });

  it("should create a product", async () => {
    const data = {
      name: "Test Product",
      variants: [
        {
          color: "Black",
          size: "M",
          price: 100,
          quantity: 10,
        },
      ],
    };

    productRepository.create.mockResolvedValue({
      id: 1,
      name: "Test Product",
      is_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    });

    const result = await productService.createProduct(data);

    expect(result).toEqual({
      id: 1,
      name: "Test Product",
      is_deleted: false,
      created_at: expect.any(String),
      updated_at: expect.any(String),
      deleted_at: null,
    });

    expect(productRepository.create).toHaveBeenCalledWith(
      mockClient as unknown as PoolClient,
      {
        name: "Test Product",
      },
    );

    expect(productVariantRepository.create).toHaveBeenCalledWith(
      mockClient as unknown as PoolClient,
      {
        productId: 1,
        color: "Black",
        size: "M",
        price: 100,
        quantity: 10,
      },
    );

    expect(mockClient.query).toHaveBeenNthCalledWith(1, "BEGIN");
  });

  it("should commit transaction after creating product", async () => {
    const data = {
      name: "Test Product",
      variants: [],
    };

    productRepository.create.mockResolvedValue({
      id: 1,
      name: "Test Product",
      is_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    });

    await productService.createProduct(data);

    expect(mockClient.query).toHaveBeenNthCalledWith(1, "BEGIN");
    expect(mockClient.query).toHaveBeenNthCalledWith(2, "COMMIT");
    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });

  it("should rollback transaction when product creation fails", async () => {
    const data = {
      name: "Test Product",
      variants: [],
    };

    productRepository.create.mockRejectedValue(new Error("DB error"));

    await expect(productService.createProduct(data)).rejects.toThrow(
      "DB error",
    );

    expect(mockClient.query).toHaveBeenNthCalledWith(1, "BEGIN");
    expect(mockClient.query).toHaveBeenNthCalledWith(2, "ROLLBACK");
    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });

  it("should rollback transaction when variant creation fails", async () => {
    const data = {
      name: "Test Product",
      variants: [
        {
          color: "Black",
          size: "M",
          price: 100,
          quantity: 10,
        },
      ],
    };

    productRepository.create.mockResolvedValue({
      id: 1,
      name: "Test Product",
      is_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    });

    productVariantRepository.create.mockRejectedValue(
      new Error("Variant DB error"),
    );

    await expect(productService.createProduct(data)).rejects.toThrow(
      "Variant DB error",
    );

    expect(mockClient.query).toHaveBeenNthCalledWith(1, "BEGIN");
    expect(mockClient.query).toHaveBeenNthCalledWith(2, "ROLLBACK");
    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });

  it("should update a product", async () => {
    const data = {
      name: "Updated Product",
    };

    productRepository.update.mockResolvedValue({
      id: 1,
      name: "Updated Product",
      is_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    });

    const result = await productService.updateProduct("1", data);

    expect(result).toEqual({
      id: 1,
      name: "Updated Product",
      is_deleted: false,
      created_at: expect.any(String),
      updated_at: expect.any(String),
      deleted_at: null,
    });

    expect(productRepository.update).toHaveBeenCalledWith(
      mockClient as unknown as PoolClient,
      "1",
      data,
    );
  });

  it("should return null when product does not exist", async () => {
    productRepository.update.mockResolvedValue(null);

    const result = await productService.updateProduct("999", {
      name: "Updated Product",
    });

    expect(result).toBeNull();

    expect(mockClient.query).toHaveBeenNthCalledWith(1, "BEGIN");
    expect(mockClient.query).toHaveBeenNthCalledWith(2, "ROLLBACK");
    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });

  it("should update a product variant", async () => {
    const data = {
      variants: [
        {
          id: 1,
          color: "Red",
          size: "L",
          price: 150,
          quantity: 20,
        },
      ],
    };

    productRepository.findById.mockResolvedValue({
      id: 1,
      name: "Test Product",
      is_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    });

    productVariantRepository.findById.mockResolvedValue({
      id: 1,
      productId: 1,
      color: "Black",
      size: "M",
      price: 100,
      quantity: 10,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });

    productVariantRepository.update.mockResolvedValue({
      id: 1,
      productId: 1,
      color: "Red",
      size: "L",
      price: 150,
      quantity: 20,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });

    productVariantRepository.findByProductId.mockResolvedValue([
      {
        id: 1,
        productId: 1,
        color: "Red",
        size: "L",
        price: 150,
        quantity: 20,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
    ]);

    await productService.updateProduct("1", data);

    expect(productVariantRepository.update).toHaveBeenCalledWith(
      mockClient as unknown as PoolClient,
      1,
      {
        color: "Red",
        size: "L",
        price: 150,
        quantity: 20,
      },
    );
  });

  it("should create a new product variant during product update", async () => {
    const data = {
      variants: [
        {
          color: "Blue",
          size: "XL",
          price: 200,
          quantity: 30,
        },
      ],
    };

    productRepository.findById.mockResolvedValue({
      id: 1,
      name: "Test Product",
      is_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    });

    productVariantRepository.create.mockResolvedValue({
      id: 2,
      productId: 1,
      color: "Blue",
      size: "XL",
      price: 200,
      quantity: 30,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });

    productVariantRepository.findByProductId.mockResolvedValue([
      {
        id: 2,
        productId: 1,
        color: "Blue",
        size: "XL",
        price: 200,
        quantity: 30,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
    ]);

    await productService.updateProduct("1", data);

    expect(productVariantRepository.create).toHaveBeenCalledWith(
      mockClient as unknown as PoolClient,
      {
        productId: 1,
        color: "Blue",
        size: "XL",
        price: 200,
        quantity: 30,
      },
    );
  });

  it("should rollback when product variant does not exist", async () => {
    const data = {
      variants: [
        {
          id: 999,
          color: "Red",
          size: "L",
          price: 150,
          quantity: 20,
        },
      ],
    };

    productRepository.findById.mockResolvedValue({
      id: 1,
      name: "Test Product",
      is_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    });

    productVariantRepository.findById.mockResolvedValue(null);

    await expect(productService.updateProduct("1", data)).rejects.toThrow(
      "Product variant 999 not found",
    );

    expect(productVariantRepository.update).not.toHaveBeenCalled();

    expect(mockClient.query).toHaveBeenNthCalledWith(1, "BEGIN");
    expect(mockClient.query).toHaveBeenNthCalledWith(2, "ROLLBACK");
    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });

  it("should rollback when product variant belongs to another product", async () => {
    const data = {
      variants: [
        {
          id: 1,
          color: "Red",
          size: "L",
          price: 150,
          quantity: 20,
        },
      ],
    };

    productRepository.findById.mockResolvedValue({
      id: 1,
      name: "Test Product",
      is_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    });

    productVariantRepository.findById.mockResolvedValue({
      id: 1,
      productId: 2,
      color: "Black",
      size: "M",
      price: 100,
      quantity: 10,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });

    await expect(productService.updateProduct("1", data)).rejects.toThrow(
      "Product variant 1 not found",
    );

    expect(productVariantRepository.update).not.toHaveBeenCalled();

    expect(mockClient.query).toHaveBeenNthCalledWith(1, "BEGIN");
    expect(mockClient.query).toHaveBeenNthCalledWith(2, "ROLLBACK");
    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });

  it("should update a product variant with empty update data", async () => {
    const data = {
      variants: [
        {
          id: 1,
        },
      ],
    };

    productRepository.findById.mockResolvedValue({
      id: 1,
      name: "Test Product",
      is_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    });

    productVariantRepository.findById.mockResolvedValue({
      id: 1,
      productId: 1,
      color: "Black",
      size: "M",
      price: 100,
      quantity: 10,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });

    productVariantRepository.update.mockResolvedValue({
      id: 1,
      productId: 1,
      color: "Black",
      size: "M",
      price: 100,
      quantity: 10,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });

    productVariantRepository.findByProductId.mockResolvedValue([
      {
        id: 1,
        productId: 1,
        color: "Black",
        size: "M",
        price: 100,
        quantity: 10,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
    ]);

    await productService.updateProduct("1", data);

    expect(productVariantRepository.update).toHaveBeenCalledWith(
      mockClient as unknown as PoolClient,
      1,
      {},
    );
  });

  it("should get a product with variants", async () => {
    productRepository.findById.mockResolvedValue({
      id: 1,
      name: "Test Product",
      is_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    });

    productVariantRepository.findByProductId.mockResolvedValue([
      {
        id: 1,
        productId: 1,
        color: "Black",
        size: "M",
        price: 100,
        quantity: 10,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
    ]);

    const result = await productService.getProduct("1");

    expect(result).toEqual({
      id: 1,
      name: "Test Product",
      is_deleted: false,
      created_at: expect.any(String),
      updated_at: expect.any(String),
      deleted_at: null,
      variants: [
        {
          id: 1,
          productId: 1,
          color: "Black",
          size: "M",
          price: 100,
          quantity: 10,
          isDeleted: false,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
          deletedAt: null,
        },
      ],
    });

    expect(productRepository.findById).toHaveBeenCalledWith("1");

    expect(productVariantRepository.findByProductId).toHaveBeenCalledWith(
      mockClient as unknown as PoolClient,
      1,
    );

    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });

  it("should return null when getting a product that does not exist", async () => {
    productRepository.findById.mockResolvedValue(null);

    const result = await productService.getProduct("999");

    expect(result).toBeNull();

    expect(productVariantRepository.findByProductId).not.toHaveBeenCalled();
    expect(mockPool.connect).not.toHaveBeenCalled();
  });

  it("should get all products with their variants", async () => {
    productRepository.findAll.mockResolvedValue([
      {
        id: 1,
        name: "Product 1",
        is_deleted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
      },
      {
        id: 2,
        name: "Product 2",
        is_deleted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
      },
    ]);

    productVariantRepository.findByProductId
      .mockResolvedValueOnce([
        {
          id: 1,
          productId: 1,
          color: "Black",
          size: "M",
          price: 100,
          quantity: 10,
          isDeleted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 2,
          productId: 2,
          color: "Red",
          size: "L",
          price: 200,
          quantity: 20,
          isDeleted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      ]);

    const result = await productService.getAllProducts();

    expect(result).toHaveLength(2);

    expect(result[0]!.id).toBe(1);
    expect(result[0]!.variants).toHaveLength(1);

    expect(result[1]!.id).toBe(2);
    expect(result[1]!.variants).toHaveLength(1);

    expect(productRepository.findAll).toHaveBeenCalledTimes(1);

    expect(productVariantRepository.findByProductId).toHaveBeenNthCalledWith(
      1,
      mockClient as unknown as PoolClient,
      1,
    );

    expect(productVariantRepository.findByProductId).toHaveBeenNthCalledWith(
      2,
      mockClient as unknown as PoolClient,
      2,
    );

    expect(mockClient.release).toHaveBeenCalledTimes(2);
  });

  it("should return an empty array when there are no products", async () => {
    productRepository.findAll.mockResolvedValue([]);

    const result = await productService.getAllProducts();

    expect(result).toEqual([]);

    expect(productVariantRepository.findByProductId).not.toHaveBeenCalled();
  });

  it("should delete a product variant", async () => {
    productVariantRepository.findById.mockResolvedValue({
      id: 1,
      productId: 1,
      color: "Black",
      size: "M",
      price: 100,
      quantity: 10,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });

    productVariantRepository.delete.mockResolvedValue(true);

    const result = await productService.deleteProductVariant(1, 1);

    expect(result).toBe(true);

    expect(productVariantRepository.findById).toHaveBeenCalledWith(
      mockClient as unknown as PoolClient,
      1,
    );

    expect(productVariantRepository.delete).toHaveBeenCalledWith(
      mockClient as unknown as PoolClient,
      1,
    );

    expect(mockClient.query).toHaveBeenNthCalledWith(1, "BEGIN");
    expect(mockClient.query).toHaveBeenNthCalledWith(2, "COMMIT");
    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });

  it("should return false when product variant does not exist", async () => {
    productVariantRepository.findById.mockResolvedValue(null);

    const result = await productService.deleteProductVariant(1, 999);

    expect(result).toBe(false);

    expect(productVariantRepository.delete).not.toHaveBeenCalled();

    expect(mockClient.query).toHaveBeenNthCalledWith(1, "BEGIN");
    expect(mockClient.query).toHaveBeenNthCalledWith(2, "ROLLBACK");
    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });

  it("should return false when product variant belongs to another product", async () => {
    productVariantRepository.findById.mockResolvedValue({
      id: 1,
      productId: 2,
      color: "Black",
      size: "M",
      price: 100,
      quantity: 10,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });

    const result = await productService.deleteProductVariant(1, 1);

    expect(result).toBe(false);

    expect(productVariantRepository.delete).not.toHaveBeenCalled();

    expect(mockClient.query).toHaveBeenNthCalledWith(1, "BEGIN");
    expect(mockClient.query).toHaveBeenNthCalledWith(2, "ROLLBACK");
    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });

  it("should rollback when deleting product variant fails", async () => {
    productVariantRepository.findById.mockResolvedValue({
      id: 1,
      productId: 1,
      color: "Black",
      size: "M",
      price: 100,
      quantity: 10,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });

    productVariantRepository.delete.mockResolvedValue(false);

    const result = await productService.deleteProductVariant(1, 1);

    expect(result).toBe(false);

    expect(mockClient.query).toHaveBeenNthCalledWith(1, "BEGIN");
    expect(mockClient.query).toHaveBeenNthCalledWith(2, "ROLLBACK");
    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });

  it("should rollback transaction when deleting product variant throws", async () => {
    productVariantRepository.findById.mockResolvedValue({
      id: 1,
      productId: 1,
      color: "Black",
      size: "M",
      price: 100,
      quantity: 10,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });

    productVariantRepository.delete.mockRejectedValue(new Error("DB error"));

    await expect(productService.deleteProductVariant(1, 1)).rejects.toThrow(
      "DB error",
    );

    expect(mockClient.query).toHaveBeenNthCalledWith(1, "BEGIN");
    expect(mockClient.query).toHaveBeenNthCalledWith(2, "ROLLBACK");
    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });

  it("should delete a product", async () => {
    productRepository.delete.mockResolvedValue(true);

    const result = await productService.deleteProduct("1");

    expect(result).toBe(true);

    expect(productRepository.delete).toHaveBeenCalledWith("1");
  });

  it("should return false when product deletion fails", async () => {
    productRepository.delete.mockResolvedValue(false);

    const result = await productService.deleteProduct("999");

    expect(result).toBe(false);

    expect(productRepository.delete).toHaveBeenCalledWith("999");
  });
});
