import type { PoolClient } from "pg";
import type { CreateUserContactData } from "../types/user.types.js";

export interface UserContactRepository {
  createContact(client: PoolClient, data: CreateUserContactData): Promise<void>;
}
