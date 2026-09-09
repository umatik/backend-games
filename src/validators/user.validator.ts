export const isValidRegisterUser = (data: unknown): boolean => {
  if (typeof data !== "object" || data === null) {
    return false;
  }

  const user = data as Record<string, unknown>;

  return (
    typeof user.email === "string" &&
    user.email.trim() !== "" &&
    typeof user.password === "string" &&
    user.password.trim() !== "" &&
    typeof user.firstName === "string" &&
    user.firstName.trim() !== "" &&
    typeof user.lastName === "string" &&
    user.lastName.trim() !== "" &&
    typeof user.phone === "string" &&
    user.phone.trim() !== "" &&
    typeof user.address === "string" &&
    user.address.trim() !== "" &&
    typeof user.city === "string" &&
    user.city.trim() !== "" &&
    typeof user.postalCode === "string" &&
    user.postalCode.trim() !== "" &&
    typeof user.country === "string" &&
    user.country.trim() !== ""
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

  return fields.every((field) => {
    return typeof user[field] === "string" && user[field].trim() !== "";
  });
};
