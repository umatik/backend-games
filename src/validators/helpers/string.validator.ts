export const isValidString = (
  value: unknown,
  maxLength: number,
): boolean => {
  return (
    typeof value === "string" &&
    value.trim() !== "" &&
    value.trim().length <= maxLength
  );
};