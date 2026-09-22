import bcrypt from "bcrypt";
import {pool} from "../database/db.js";
import type {UserInterface} from "../repositories/user/user.interface.js";
import type {UserContactInterface} from "../repositories/user/user-contact.interface.js";
import type {RoleInterface} from "../repositories/role/role.interface.js";
import {EmailAlreadyExistsError} from "../errors/email-already-exists.error.js";
import type {PoolClient} from "pg";
import type {
  CreatedUser,
  CreateUserContactData,
  CreateUserData,
  RegisterUserData,
  UpdateUserContactData,
  UpdateUserData,
  UpdateUserRequest,
  UserDetails,
} from "../types/user.types.js";

export class UserService {
  constructor(
    private userRepository: UserInterface,
    private userContactRepository: UserContactInterface,
    private roleRepository: RoleInterface,
  ) {
  }


  async getUsers(
    page: number,
    limit: number,
  ): Promise<{
    users: UserDetails[];
    total: number;
  }> {
    const client = await pool.connect();

    try {
      const users = await this.userRepository.findAll(
        client,
        page,
        limit,
      );

      const total = await this.userRepository.countAll(client);

      return {
        users,
        total,
      };
    } finally {
      client.release();
    }
  }

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
        email: data.email.trim().toLowerCase(),
        passwordHash,
      });

      await this.roleRepository.assignToUser(client, user.id, "user");

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
    data: UpdateUserRequest,
  ): Promise<UserDetails | null> {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const userData: UpdateUserData = {};

      if (data.email !== undefined) {
        userData.email = data.email;
      }

      if (data.password !== undefined) {
        userData.password = await bcrypt.hash(data.password, 12);
      }

      if (Object.keys(userData).length > 0) {
        const user = await this.userRepository.update(
          client,
          userId,
          userData,
        );

        if (!user) {
          await client.query("ROLLBACK");
          return null;
        }
      }

      const contactData: UpdateUserContactData = {};

      if (data.firstName !== undefined) {
        contactData.firstName = data.firstName;
      }

      if (data.lastName !== undefined) {
        contactData.lastName = data.lastName;
      }

      if (data.phone !== undefined) {
        contactData.phone = data.phone;
      }

      if (data.address !== undefined) {
        contactData.address = data.address;
      }

      if (data.city !== undefined) {
        contactData.city = data.city;
      }

      if (data.postalCode !== undefined) {
        contactData.postalCode = data.postalCode;
      }

      if (data.country !== undefined) {
        contactData.country = data.country;
      }

      if (Object.keys(contactData).length > 0) {
        const contact = await this.userContactRepository.update(
          client,
          userId,
          contactData,
        );

        if (!contact) {
          await client.query("ROLLBACK");
          return null;
        }
      }

      const user = await this.userRepository.findById(client, userId);

      await client.query("COMMIT");

      return user;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}