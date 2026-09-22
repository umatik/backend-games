export const isValidPagination = (
  page: number,
  limit: number,
): boolean => {
  return (
    Number.isInteger(page) &&
    page > 0 &&
    Number.isInteger(limit) &&
    limit > 0
  );
};