import { z } from "zod";

const text = (maxLength: number) => z.string().trim().min(1).max(maxLength);

const email = z.string().trim().max(255).pipe(z.email());

/** Hasła nie przycinamy, ale nie może składać się z samych spacji. */
const password = z
  .string()
  .min(8)
  .max(255)
  .refine((value) => value.trim() !== "", { message: "Password is required" });

const contactFields = {
  firstName: text(100),
  lastName: text(100),
  phone: text(50),
  address: text(10_000),
  city: text(100),
  postalCode: text(20),
  country: text(100),
};

export const registerUserSchema = z.object({
  email,
  password,
  ...contactFields,
});

export const updateUserSchema = z
  .strictObject({
    email: email.optional(),
    firstName: contactFields.firstName.optional(),
    lastName: contactFields.lastName.optional(),
    phone: contactFields.phone.optional(),
    address: contactFields.address.optional(),
    city: contactFields.city.optional(),
    postalCode: contactFields.postalCode.optional(),
    country: contactFields.country.optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "At least one field is required",
  });

export const forgotPasswordSchema = z.object({
  email: email.transform((value) => value.toLowerCase()),
});

export const resetPasswordSchema = z.object({
  token: text(255),
  password,
});
