export const isValidString = (value: unknown, maxLength: number): boolean => {
  return (
    typeof value === "string" &&
    value.trim() !== "" &&
    value.trim().length <= maxLength
  );
};

export const isValidResetPassword = (
  data: unknown,
): data is { token: string; password: string } => {
  if (typeof data !== "object" || data === null) {
    return false;
  }

  const { token, password } = data as {
    token?: unknown;
    password?: unknown;
  };

  return (
    typeof token === "string" &&
    token.trim().length > 0 &&
    typeof password === "string" &&
    password.length >= 8 &&
    password.length <= 255
  );
};
