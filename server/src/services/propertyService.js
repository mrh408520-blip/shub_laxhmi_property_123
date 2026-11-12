export function createPropertyService(properties) {
  return {
    async list(filters) {
      const result = await properties.list(filters);
      return {
        data: result.items,
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / filters.limit),
        },
      };
    },
    async get(id) {
      const property = await properties.findById(id);
      if (!property) {
        const error = new Error("Property not found.");
        error.status = 404;
        throw error;
      }
      return property;
    },
    async create(ownerId, input) {
      return properties.create(ownerId, input);
    },
    async update(ownerId, id, input, isAdmin = false) {
      const owner = await properties.findOwner(id);
      if (!owner) {
        const error = new Error("Property not found.");
        error.status = 404;
        throw error;
      }
      if (owner !== ownerId && !isAdmin) {
        const error = new Error("You do not have permission to change this property.");
        error.status = 403;
        throw error;
      }
      return properties.update(id, input);
    },
    async delete(ownerId, id, isAdmin = false) {
      const owner = await properties.findOwner(id);
      if (!owner) {
        const error = new Error("Property not found.");
        error.status = 404;
        throw error;
      }
      if (owner !== ownerId && !isAdmin) {
        const error = new Error("You do not have permission to delete this property.");
        error.status = 403;
        throw error;
      }
      await properties.delete(id);
    },
  };
}
