import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { PoolClient } from "pg";
import type { UserInterface } from "../../repositories/user/user.interface.js";
import type { UserContactInterface } from "../../repositories/user/user-contact.interface.js";
import type { RoleInterface } from "../../repositories/role/role.interface.js";

const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};

const mockPool = {
  connect: jest.fn<() => Promise<PoolClient>>(),
};

jest.unstable_mockModule("../../database/db.js", () => ({
  pool: mockPool,
}));

const { UserService: MockedUserService } =
  await import("../../services/user.service.js");

describe("UserService", () => {
  let userService: InstanceType<typeof MockedUserService>;
  let userRepository: jest.Mocked<UserInterface>;
  let userContactRepository: jest.Mocked<UserContactInterface>;
  let roleRepository: jest.Mocked<RoleInterface>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPool.connect.mockResolvedValue(mockClient as unknown as PoolClient);

    userRepository = {
      createUser: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      countAll: jest.fn(),
    };

    userContactRepository = {
      createContact: jest.fn(),
      update: jest.fn(),
    };

    roleRepository = {
      assignToUser: jest.fn(),
    };

    userService = new MockedUserService(
      userRepository,
      userContactRepository,
      roleRepository,
      mockPool,
    );
  });

  describe("getUsers", () => {
    it("should get users with pagination and total", async () => {
      const users = [
        {
          id: 1,
          email: "alice@example.com",
          firstName: "Alice",
          lastName: "Test",
          phone: "123456789",
          address: "Test Street 1",
          city: "Warsaw",
          postalCode: "00-001",
          country: "Poland",
        },
        {
          id: 2,
          email: "bob@example.com",
          firstName: "Bob",
          lastName: "Test",
          phone: "987654321",
          address: "Test Street 2",
          city: "Warsaw",
          postalCode: "00-002",
          country: "Poland",
        },
      ];

      userRepository.findAll.mockResolvedValue(users);
      userRepository.countAll.mockResolvedValue(87);

      const result = await userService.getUsers(2, 10);

      expect(result).toEqual({
        users,
        total: 87,
      });

      expect(userRepository.findAll).toHaveBeenCalledWith(
        mockClient as unknown as PoolClient,
        2,
        10,
      );

      expect(userRepository.countAll).toHaveBeenCalledWith(
        mockClient as unknown as PoolClient,
      );

      expect(mockPool.connect).toHaveBeenCalledTimes(1);
      expect(mockClient.release).toHaveBeenCalledTimes(1);
    });

    it("should return empty users with total", async () => {
      userRepository.findAll.mockResolvedValue([]);
      userRepository.countAll.mockResolvedValue(0);

      const result = await userService.getUsers(1, 20);

      expect(result).toEqual({
        users: [],
        total: 0,
      });

      expect(userRepository.findAll).toHaveBeenCalledWith(
        mockClient as unknown as PoolClient,
        1,
        20,
      );

      expect(userRepository.countAll).toHaveBeenCalledWith(
        mockClient as unknown as PoolClient,
      );

      expect(mockClient.release).toHaveBeenCalledTimes(1);
    });
  });

  describe("getUserById", () => {
    it("should get a user by id", async () => {
      const user = {
        id: 1,
        email: "alice@example.com",
        firstName: "Alice",
        lastName: "Test",
        phone: "123456789",
        address: "Test Street 1",
        city: "Warsaw",
        postalCode: "00-001",
        country: "Poland",
      };

      userRepository.findById.mockResolvedValue(user);

      const result = await userService.getUserById(1);

      expect(result).toEqual(user);

      expect(userRepository.findById).toHaveBeenCalledWith(
        mockClient as unknown as PoolClient,
        1,
      );

      expect(mockClient.release).toHaveBeenCalledTimes(1);
    });

    it("should return null when user does not exist", async () => {
      userRepository.findById.mockResolvedValue(null);

      const result = await userService.getUserById(999);

      expect(result).toBeNull();

      expect(mockClient.release).toHaveBeenCalledTimes(1);
    });
  });

  describe("register", () => {
    it("should register a user", async () => {
      const createdUser = {
        id: 1,
        email: "alice@example.com",
      };

      userRepository.createUser.mockResolvedValue(createdUser);

      const result = await userService.register({
        email: " Alice@Example.com ",
        password: "alamakota",
        firstName: "Alice",
        lastName: "Test",
        phone: "123456789",
        address: "Test Street 1",
        city: "Warsaw",
        postalCode: "00-001",
        country: "Poland",
      });

      expect(result).toEqual(createdUser);

      expect(userRepository.createUser).toHaveBeenCalledWith(
        mockClient as unknown as PoolClient,
        expect.objectContaining({
          email: "alice@example.com",
        }),
      );

      expect(roleRepository.assignToUser).toHaveBeenCalledWith(
        mockClient as unknown as PoolClient,
        1,
        "user",
      );

      expect(userContactRepository.createContact).toHaveBeenCalledWith(
        mockClient as unknown as PoolClient,
        {
          userId: 1,
          firstName: "Alice",
          lastName: "Test",
          phone: "123456789",
          address: "Test Street 1",
          city: "Warsaw",
          postalCode: "00-001",
          country: "Poland",
        },
      );

      expect(mockClient.query).toHaveBeenNthCalledWith(1, "BEGIN");
      expect(mockClient.query).toHaveBeenNthCalledWith(2, "COMMIT");
      expect(mockClient.release).toHaveBeenCalledTimes(1);
    });

    it("should rollback when registration fails", async () => {
      userRepository.createUser.mockRejectedValue(new Error("DB error"));

      await expect(
        userService.register({
          email: "alice@example.com",
          password: "alamakota",
          firstName: "Alice",
          lastName: "Test",
          phone: "123456789",
          address: "Test Street 1",
          city: "Warsaw",
          postalCode: "00-001",
          country: "Poland",
        }),
      ).rejects.toThrow("DB error");

      expect(mockClient.query).toHaveBeenNthCalledWith(1, "BEGIN");
      expect(mockClient.query).toHaveBeenNthCalledWith(2, "ROLLBACK");
      expect(mockClient.release).toHaveBeenCalledTimes(1);
    });
  });

  describe("updateUser", () => {
    it("should update user data", async () => {
      const updatedUser = {
        id: 1,
        email: "alice@example.com",
        firstName: "Alice",
        lastName: "Updated",
        phone: "123456789",
        address: "Test Street 1",
        city: "Warsaw",
        postalCode: "00-001",
        country: "Poland",
      };

      userRepository.update.mockResolvedValue(updatedUser);
      userContactRepository.update.mockResolvedValue({
        userId: 1,
        firstName: "Alice",
        lastName: "Updated",
        phone: "123456789",
        address: "Test Street 1",
        city: "Warsaw",
        postalCode: "00-001",
        country: "Poland",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      userRepository.findById.mockResolvedValue(updatedUser);

      const result = await userService.updateUser(1, {
        email: "alice@example.com",
        firstName: "Alice",
        lastName: "Updated",
      });

      expect(result).toEqual(updatedUser);

      expect(userRepository.update).toHaveBeenCalledWith(
        mockClient as unknown as PoolClient,
        1,
        {
          email: "alice@example.com",
        },
      );

      expect(userContactRepository.update).toHaveBeenCalledWith(
        mockClient as unknown as PoolClient,
        1,
        {
          firstName: "Alice",
          lastName: "Updated",
        },
      );

      expect(userRepository.findById).toHaveBeenCalledWith(
        mockClient as unknown as PoolClient,
        1,
      );

      expect(mockClient.query).toHaveBeenNthCalledWith(1, "BEGIN");
      expect(mockClient.query).toHaveBeenNthCalledWith(2, "COMMIT");
      expect(mockClient.release).toHaveBeenCalledTimes(1);
    });

    it("should return null when user does not exist", async () => {
      userRepository.update.mockResolvedValue(null);

      const result = await userService.updateUser(999, {
        email: "test@example.com",
      });

      expect(result).toBeNull();

      expect(mockClient.query).toHaveBeenNthCalledWith(1, "BEGIN");
      expect(mockClient.query).toHaveBeenNthCalledWith(2, "ROLLBACK");
      expect(mockClient.release).toHaveBeenCalledTimes(1);
    });

    it("should rollback when contact update fails", async () => {
      userRepository.update.mockResolvedValue({
        id: 1,
        email: "alice@example.com",
        firstName: "Alice",
        lastName: "Test",
        phone: "123456789",
        address: "Test Street 1",
        city: "Warsaw",
        postalCode: "00-001",
        country: "Poland",
      });

      userContactRepository.update.mockRejectedValue(
        new Error("Contact DB error"),
      );

      await expect(
        userService.updateUser(1, {
          email: "alice@example.com",
          firstName: "Updated",
        }),
      ).rejects.toThrow("Contact DB error");

      expect(mockClient.query).toHaveBeenNthCalledWith(1, "BEGIN");
      expect(mockClient.query).toHaveBeenNthCalledWith(2, "ROLLBACK");
      expect(mockClient.release).toHaveBeenCalledTimes(1);
    });
  });
});
