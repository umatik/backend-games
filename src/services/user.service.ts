import bcrypt from "bcrypt";
import { pool } from "../database/db.js";
import type { UserInterface } from "../repositories/user/user.interface.js";
import type { UserContactInterface } from "../repositories/user/user-contact.interface.js";
import { EmailAlreadyExistsError } from "../errors/email-already-exists.error.js";
import type { PoolClient } from "pg";
import type {
  CreateUserContactData,
  CreateUserData,
  CreatedUser,
  RegisterUserData,
  UserDetails,
  UpdateUserData,
} from "../types/user.types.js";

export class UserService {
  constructor(
    private userRepository: UserInterface,
    private userContactRepository: UserContactInterface,
  ) {}

  async getUserById(userId: number): Promise<UserDetails | null> {
    const client = await pool.connect();

    try {
      return await this.userRepository.findById(client, userId);
    } finally {
      client.release();
    }
  }

  async register(data: RegisterUserData) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const passwordHash = await bcrypt.hash(data.password, 12);

      const user = await this.createUser(client, {
        email: data.email,
        passwordHash,
      });

      const contactData: CreateUserContactData = {
        userId: user.id,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        address: data.address,
        city: data.city,
        postalCode: data.postalCode,
        country: data.country,
      };

      await this.userContactRepository.createContact(client, contactData);

      await client.query("COMMIT");

      return user;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  private async createUser(
    client: PoolClient,
    data: CreateUserData,
  ): Promise<CreatedUser> {
    try {
      return await this.userRepository.createUser(client, data);
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "23505"
      ) {
        throw new EmailAlreadyExistsError();
      }

      throw error;
    }
  }

  async updateUser(
    userId: number,
    data: UpdateUserData,
  ): Promise<UserDetails | null> {
    const client = await pool.connect();

    try {
      return await this.userRepository.update(client, userId, data);
    } finally {
      client.release();
    }
  }
}
