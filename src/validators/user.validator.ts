import { isValidString } from "./helpers/string.validator.js";

export const isValidRegisterUser = (data: unknown): boolean => {
  if (typeof data !== "object" || data === null) {
    return false;
  }

  const user = data as Record<string, unknown>;

  const email = typeof user.email === "string" ? user.email.trim() : "";

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return (
    emailRegex.test(email) &&
    email.length <= 255 &&
    isValidString(user.password, 255) &&
    typeof user.password === "string" &&
    user.password.length >= 8 &&
    isValidString(user.firstName, 100) &&
    isValidString(user.lastName, 100) &&
    isValidString(user.phone, 50) &&
    isValidString(user.address, Number.MAX_SAFE_INTEGER) &&
    isValidString(user.city, 100) &&
    isValidString(user.postalCode, 20) &&
    isValidString(user.country, 100)
  );
};

export const isValidUpdateUser = (data: unknown): boolean => {
  if (typeof data !== "object" || data === null) {
    return false;
  }

  const user = data as Record<string, unknown>;

  const allowedFields = [
    "email",
    "firstName",
    "lastName",
    "phone",
    "address",
    "city",
    "postalCode",
    "country",
  ];

  const fields = Object.keys(user);

  if (fields.length === 0) {
    return false;
  }

  if (!fields.every((field) => allowedFields.includes(field))) {
    return false;
  }

  const fieldMaxLengths: Record<string, number> = {
    email: 255,
    firstName: 100,
    lastName: 100,
    phone: 50,
    address: Number.MAX_SAFE_INTEGER,
    city: 100,
    postalCode: 20,
    country: 100,
  };

  return fields.every((field) => {
    const maxLength = fieldMaxLengths[field];

    return maxLength !== undefined && isValidString(user[field], maxLength);
  });
};

export const isValidForgotPassword = (
  data: unknown,
): data is { email: string } => {
  if (typeof data !== "object" || data === null) {
    return false;
  }

  const { email } = data as { email?: unknown };

  return (
    typeof email === "string" &&
    email.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  );
};
