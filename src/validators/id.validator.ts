export const parseId = (
  id: string | string[] | undefined,
): number | null => {
  if (typeof id !== "string") {
    return null;
  }

  const numericId = Number(id);

  if (!Number.isInteger(numericId) || numericId <= 0) {
    return null;
  }

  return numericId;
};