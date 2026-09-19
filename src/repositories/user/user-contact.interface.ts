import type {PoolClient} from "pg";
import type {
  CreateUserContactData,
  UpdateUserContactData, UserContactDetails,
} from "../../types/user.types.js";

export interface UserContactInterface {
  createContact(client: PoolClient, data: CreateUserContactData): Promise<void>;

  update(
    client: PoolClient,
    userId: number,
    data: UpdateUserContactData,
  ): Promise<UserContactDetails | null>;
}
