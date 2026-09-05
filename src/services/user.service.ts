import bcrypt from "bcrypt";
import { pool } from "../database/db.js";
import type { UserRepository } from "../repositories/user.repository.js";
import type {
  UserContactRepository,
  CreateUserContactData,
} from "../repositories/user-contact.repository.js";

export type RegisterUserData = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
};

export class UserService {
  constructor(
    private userRepository: UserRepository,
    private userContactRepository: UserContactRepository,
  ) {}

  async register(data: RegisterUserData) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const passwordHash = await bcrypt.hash(data.password, 12);

      const user = await this.userRepository.createUser(client, {
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
}
