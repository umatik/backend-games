import type { PoolClient } from "pg";

export type CreateUserContactData = {
  userId: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
};

export interface UserContactRepository {
  createContact(client: PoolClient, data: CreateUserContactData): Promise<void>;
}
