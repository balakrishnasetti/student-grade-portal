function getPagination(query = {}) {
  const requestedPage = Number(query.page);
  const requestedLimit = Number(query.limit);
  const page = Number.isInteger(requestedPage) && requestedPage >= 1 ? requestedPage : 1;
  const limit = Number.isInteger(requestedLimit) && requestedLimit >= 1
    ? Math.min(requestedLimit, 100)
    : 10;

  return { page, limit, skip: (page - 1) * limit };
}

function buildMeta(total, page, limit) {
  const totalPages = Math.ceil(total / limit);
  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

module.exports = { getPagination, buildMeta };
