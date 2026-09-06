export type User = {
  id: number;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
  deletedAt: Date | null;
};

export type UserContactDetails = {
  userId: number;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  createdAt: Date;
  updatedAt: Date;
};

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

export type CreateUserData = {
  email: string;
  passwordHash: string;
};

export type CreatedUser = {
  id: number;
  email: string;
};

export type CreateUserContactData = {
  userId: number;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
};
