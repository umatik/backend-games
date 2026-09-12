import { beforeEach, describe, jest, it, expect } from "@jest/globals";
import type { PoolClient } from "pg";
import {
  type Database,
  AuthenticationService,
} from "../../services/authentication.service.js";
import type { AuthenticationInterface } from "../../repositories/authentication/authentication.interface.js";
import type { JwtService } from "../../services/jwt.service.js";

const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};

describe("AuthenticationService", () => {
  let authenticationService: AuthenticationService;
  let authRepository: jest.Mocked<AuthenticationInterface>;
  let jwtService: jest.Mocked<JwtService>;
  let mockPool: Database;

  beforeEach(() => {
    jest.clearAllMocks();

    authRepository = {
      findUserByEmail: jest.fn(),
      logLogin: jest.fn(),
    };

    jwtService = {
      generateToken: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;

    mockPool = {
      connect: jest
        .fn<() => Promise<PoolClient>>()
        .mockResolvedValue(mockClient as unknown as PoolClient),
    };

    authenticationService = new AuthenticationService(
      authRepository,
      jwtService,
      mockPool,
    );
  });

  it("should login user with valid credentials", async () => {
    authRepository.findUserByEmail.mockResolvedValue({
      id: "1",
      email: "test@test.com",
      passwordHash: await import("bcrypt").then((bcrypt) =>
        bcrypt.default.hash("password123", 10),
      ),
    });

    authRepository.logLogin.mockResolvedValue();

    jwtService.generateToken.mockReturnValue("test-token");

    const result = await authenticationService.login(
      "test@test.com",
      "password123",
    );

    expect(result).toEqual({
      user: {
        id: "1",
        email: "test@test.com",
        passwordHash: expect.any(String),
      },
      token: "test-token",
    });

    expect(authRepository.findUserByEmail).toHaveBeenCalledWith(
      mockClient as unknown as PoolClient,
      "test@test.com",
    );

    expect(authRepository.logLogin).toHaveBeenCalledWith(
      mockClient as unknown as PoolClient,
      {
        userId: "1",
        email: "test@test.com",
        success: true,
        ipAddress: null,
        userAgent: null,
      },
    );

    expect(jwtService.generateToken).toHaveBeenCalledWith("1", "test@test.com");

    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });

  it("should reject login when user does not exist", async () => {
    authRepository.findUserByEmail.mockResolvedValue(null);
    authRepository.logLogin.mockResolvedValue();

    await expect(
      authenticationService.login("unknown@test.com", "password123"),
    ).rejects.toThrow("Invalid credentials");

    expect(authRepository.logLogin).toHaveBeenCalledWith(
      mockClient as unknown as PoolClient,
      {
        userId: null,
        email: "unknown@test.com",
        success: false,
        ipAddress: null,
        userAgent: null,
      },
    );

    expect(jwtService.generateToken).not.toHaveBeenCalled();
    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });

  it("should reject login when password is invalid", async () => {
    authRepository.findUserByEmail.mockResolvedValue({
      id: "1",
      email: "test@test.com",
      passwordHash: await import("bcrypt").then((bcrypt) =>
        bcrypt.default.hash("correct-password", 10),
      ),
    });

    authRepository.logLogin.mockResolvedValue();

    await expect(
      authenticationService.login("test@test.com", "wrong-password"),
    ).rejects.toThrow("Invalid credentials");

    expect(authRepository.logLogin).toHaveBeenCalledWith(
      mockClient as unknown as PoolClient,
      {
        userId: "1",
        email: "test@test.com",
        success: false,
        ipAddress: null,
        userAgent: null,
      },
    );

    expect(jwtService.generateToken).not.toHaveBeenCalled();
    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });

  it("should release client when repository fails", async () => {
    authRepository.findUserByEmail.mockRejectedValue(new Error("DB error"));

    await expect(
      authenticationService.login("test@test.com", "password123"),
    ).rejects.toThrow("DB error");

    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });

  it("should release client when login logging fails", async () => {
    authRepository.findUserByEmail.mockResolvedValue({
      id: "1",
      email: "test@test.com",
      passwordHash: await import("bcrypt").then((bcrypt) =>
        bcrypt.default.hash("password123", 10),
      ),
    });

    authRepository.logLogin.mockRejectedValue(new Error("Logging DB error"));

    await expect(
      authenticationService.login("test@test.com", "password123"),
    ).rejects.toThrow("Logging DB error");

    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });
});
