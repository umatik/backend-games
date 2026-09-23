export const isValidPagination = (page: number, limit: number): boolean => {
  return (
    Number.isInteger(page) &&
    Number.isInteger(limit) &&
    page > 0 &&
    limit > 0 &&
    limit <= 100
  );
};
