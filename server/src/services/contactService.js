export function createContactService(contacts, propertyService) {
  return {
    async submit(input) {
      let propertyTitle;
      if (input.propertyId) {
        const property = await propertyService.get(input.propertyId);
        propertyTitle = property.title;
      }
      const { propertyId, ...contact } = input;
      const record = await contacts.create({ ...contact, propertyId, propertyTitle });
      return { id: record.id, status: record.status, createdAt: record.createdAt };
    },
  };
}
