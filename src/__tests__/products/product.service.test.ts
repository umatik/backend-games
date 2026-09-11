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
    // Czyścimy historię wywołań mocków przed każdym testem.
    // Dzięki temu jeden test nie wpływa na kolejny.
    jest.clearAllMocks();

    // Mockujemy ProductRepository.
    productRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    // Mockujemy ProductVariantRepository.
    productVariantRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByProductId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    // Mockujemy połączenie z bazą.
    // pool.connect() zwróci nasz sztuczny mockClient.
    mockPool = {
      connect: jest
        .fn<() => Promise<PoolClient>>()
        .mockResolvedValue(mockClient as unknown as PoolClient),
    };

    // Wstrzykujemy mocki do prawdziwego ProductService.
    productService = new ProductService(
      productRepository,
      productVariantRepository,
      mockPool,
    );
  });

  // Testujemy poprawne utworzenie produktu razem z wariantem.
  //
  // Przygotowanie:
  // - ProductRepository.create() zwraca utworzony produkt.
  //
  // Wykonanie:
  // - wywołujemy createProduct().
  //
  // Sprawdzamy:
  // - zwrócony produkt,
  // - dane przekazane do ProductRepository,
  // - dane przekazane do ProductVariantRepository,
  // - rozpoczęcie transakcji.
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

  // Sprawdzamy poprawne zakończenie transakcji po utworzeniu produktu.
  //
  // Oczekujemy kolejności:
  // BEGIN -> COMMIT -> release()
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

  // Sprawdzamy rollback, kiedy tworzenie produktu zakończy się błędem.
  //
  // Symulujemy błąd ProductRepository.create().
  //
  // Oczekujemy:
  // BEGIN -> błąd -> ROLLBACK -> release()
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

  // Sprawdzamy rollback, kiedy produkt został utworzony,
  // ale tworzenie wariantu zakończyło się błędem.
  //
  // Symulujemy:
  // productRepository.create() -> sukces
  // productVariantRepository.create() -> błąd
  //
  // Oczekujemy:
  // BEGIN -> błąd -> ROLLBACK -> release()
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

  // Sprawdzamy aktualizację nazwy produktu.
  //
  // Service wywołuje:
  // productRepository.update()
  //
  // Sprawdzamy:
  // - zwrócony produkt,
  // - ID,
  // - przekazane dane.
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

  // Sprawdzamy sytuację, kiedy aktualizacja produktu
  // nie znajduje produktu.
  //
  // update() zwraca null.
  //
  // Service powinien:
  // - wykonać ROLLBACK,
  // - zwrócić null,
  // - zwolnić połączenie.
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

  // Sprawdzamy aktualizację istniejącego wariantu.
  //
  // Przygotowanie:
  // - produkt istnieje,
  // - wariant istnieje,
  // - wariant należy do tego produktu.
  //
  // Następnie Service powinien wywołać update() wariantu.
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

  // Sprawdzamy dodanie nowego wariantu podczas update produktu.
  //
  // Brak id oznacza, że jest to nowy wariant.
  //
  // Service powinien więc użyć create(), a nie update().
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

  // Sprawdzamy błąd, kiedy wariant podany w update
  // nie istnieje.
  //
  // findById() zwraca null.
  //
  // Oczekujemy:
  // - ProductVariantNotFoundError,
  // - brak update(),
  // - ROLLBACK,
  // - release().
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

  // Sprawdzamy zabezpieczenie przed aktualizacją wariantu,
  // który istnieje, ale należy do INNEGO produktu.
  //
  // Produkt ma id 1.
  // Wariant ma productId 2.
  //
  // Service powinien potraktować go tak samo,
  // jak nieistniejący wariant.
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

  // Sprawdzamy aktualizację wariantu bez żadnych pól do zmiany.
  //
  // Service powinien przygotować pusty obiekt variantData
  // i przekazać go do update().
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

  // Sprawdzamy pobranie produktu razem z jego wariantami.
  //
  // ProductRepository.findById() znajduje produkt.
  // ProductVariantRepository.findByProductId() znajduje warianty.
  //
  // Service powinien połączyć oba wyniki w jeden obiekt.
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

  // Sprawdzamy sytuację, kiedy produkt nie istnieje.
  //
  // Service powinien:
  // - zwrócić null,
  // - NIE pobierać wariantów,
  // - NIE otwierać połączenia z bazą.
  it("should return null when getting a product that does not exist", async () => {
    productRepository.findById.mockResolvedValue(null);

    const result = await productService.getProduct("999");

    expect(result).toBeNull();

    expect(productVariantRepository.findByProductId).not.toHaveBeenCalled();
    expect(mockPool.connect).not.toHaveBeenCalled();
  });

  // Sprawdzamy pobranie wielu produktów razem z wariantami.
  //
  // findAll() zwraca produkty.
  // Następnie Service pobiera warianty każdego produktu.
  //
  // Na końcu otrzymujemy tablicę ProductDetails[].
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

    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });

  // Sprawdzamy sytuację, kiedy baza nie zwraca żadnych produktów.
  //
  // Service powinien zwrócić pustą tablicę.
  it("should return an empty array when there are no products", async () => {
    productRepository.findAll.mockResolvedValue([]);

    const result = await productService.getAllProducts();

    expect(result).toEqual([]);

    expect(productVariantRepository.findByProductId).not.toHaveBeenCalled();
    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });

  // Sprawdzamy poprawne usunięcie wariantu.
  //
  // Najpierw sprawdzamy, czy wariant istnieje
  // i należy do właściwego produktu.
  //
  // Następnie delete() -> COMMIT -> release().
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

  // Sprawdzamy sytuację, kiedy wariant nie istnieje.
  //
  // Service powinien:
  // - zwrócić false,
  // - wykonać ROLLBACK,
  // - NIE wykonać delete().
  it("should return false when product variant does not exist", async () => {
    productVariantRepository.findById.mockResolvedValue(null);

    const result = await productService.deleteProductVariant(1, 999);

    expect(result).toBe(false);

    expect(productVariantRepository.delete).not.toHaveBeenCalled();

    expect(mockClient.query).toHaveBeenNthCalledWith(1, "BEGIN");
    expect(mockClient.query).toHaveBeenNthCalledWith(2, "ROLLBACK");
    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });

  // Sprawdzamy zabezpieczenie przed usunięciem wariantu
  // należącego do innego produktu.
  //
  // Wariant istnieje, ale productId się nie zgadza.
  //
  // Service powinien zwrócić false i wykonać ROLLBACK.
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

  // Sprawdzamy sytuację, kiedy Repository nie usunął wariantu.
  //
  // delete() zwraca false.
  //
  // Service powinien:
  // - zwrócić false,
  // - zrobić ROLLBACK.
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

  // Sprawdzamy prawdziwy błąd podczas usuwania wariantu.
  //
  // delete() rzuca wyjątek.
  //
  // Service powinien:
  // - przekazać błąd dalej,
  // - wykonać ROLLBACK,
  // - zwolnić połączenie.
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

  // Sprawdzamy, czy Service poprawnie przekazuje
  // żądanie usunięcia produktu do Repository.
  //
  // deleteProduct() nie posiada własnej transakcji.
  // Deleguje operację bezpośrednio do Repository.
  it("should delete a product", async () => {
    productRepository.delete.mockResolvedValue(true);

    const result = await productService.deleteProduct("1");

    expect(result).toBe(true);

    expect(productRepository.delete).toHaveBeenCalledWith("1");
  });

  // Sprawdzamy sytuację, kiedy Repository zwraca false.
  //
  // Service powinien po prostu zwrócić false.
  it("should return false when product deletion fails", async () => {
    productRepository.delete.mockResolvedValue(false);

    const result = await productService.deleteProduct("999");

    expect(result).toBe(false);

    expect(productRepository.delete).toHaveBeenCalledWith("999");
  });
});
