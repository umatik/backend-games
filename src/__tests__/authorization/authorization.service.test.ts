import { beforeEach, describe, jest, it, expect } from "@jest/globals";
import type { PoolClient } from "pg";
import {
  type Database,
  AuthorizationService,
} from "../../services/authorization.service.js";
import type { PermissionInterface } from "../../repositories/permissions/permission.interface.js";

const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};

describe("AuthorizationService", () => {
  let authorizationService: AuthorizationService;
  let permissionRepository: jest.Mocked<PermissionInterface>;
  let mockPool: Database;

  beforeEach(() => {
    jest.clearAllMocks();

    permissionRepository = {
      findByUserId: jest.fn(),
    };

    mockPool = {
      connect: jest
        .fn<() => Promise<PoolClient>>()
        .mockResolvedValue(mockClient as unknown as PoolClient),
    };

    authorizationService = new AuthorizationService(
      permissionRepository,
      mockPool,
    );
  });

  it("should return true when user has permission", async () => {
    permissionRepository.findByUserId.mockResolvedValue([
      "products.read",
      "products.create",
    ]);

    const result = await authorizationService.hasPermission(1, "products.read");

    expect(result).toBe(true);

    expect(permissionRepository.findByUserId).toHaveBeenCalledWith(
      mockClient as unknown as PoolClient,
      1,
    );

    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });

  it("should return false when user does not have permission", async () => {
    permissionRepository.findByUserId.mockResolvedValue(["products.read"]);

    const result = await authorizationService.hasPermission(
      1,
      "products.create",
    );

    expect(result).toBe(false);

    expect(permissionRepository.findByUserId).toHaveBeenCalledWith(
      mockClient as unknown as PoolClient,
      1,
    );

    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });

  it("should return false when user has no permissions", async () => {
    permissionRepository.findByUserId.mockResolvedValue([]);

    const result = await authorizationService.hasPermission(1, "products.read");

    expect(result).toBe(false);

    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });

  it("should release client when repository fails", async () => {
    permissionRepository.findByUserId.mockRejectedValue(new Error("DB error"));

    await expect(
      authorizationService.hasPermission(1, "products.read"),
    ).rejects.toThrow("DB error");

    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });
});
