import { z } from "zod";

const propertyTypes = ["plot", "house", "rental", "commercial"];
const propertyStatuses = ["available", "sold", "rented"];
const httpImageUrl = z.string().trim().url().max(2048)
  .refine((value) => /^https?:\/\//i.test(value), "Use an HTTP(S) image URL.");
const optionalImageUrl = httpImageUrl.nullable().optional();
const optionalPropertyFields = {
  imageUrls: z.array(httpImageUrl).max(30).optional(),
  bedrooms: z.number().finite().min(0).max(100).optional(),
  bathrooms: z.number().finite().min(0).max(100).optional(),
  areaSqFt: z.number().finite().min(0).max(100_000_000).optional(),
  parking: z.number().finite().min(0).max(100).optional(),
  floor: z.string().trim().max(80).optional(),
  address: z.string().trim().max(500).optional(),
  latitude: z.number().finite().min(-90).max(90).optional(),
  longitude: z.number().finite().min(-180).max(180).optional(),
  highlights: z.array(z.string().trim().min(1).max(200)).max(30).optional(),
  amenities: z.array(z.string().trim().min(1).max(200)).max(30).optional(),
  facilities: z.array(z.string().trim().min(1).max(200)).max(30).optional(),
  additionalDetails: z.array(z.string().trim().min(1).max(300)).max(30).optional(),
  nearbyLocations: z.array(z.object({
    name: z.string().trim().min(1).max(160),
    distance: z.string().trim().max(80).optional(),
    verified: z.boolean().optional(),
  }).strict()).max(30).optional(),
};

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  password: z.string().min(10).max(128),
}).strict();

export const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
}).strict();

const propertyFields = {
  title: z.string().trim().min(3).max(160),
  type: z.enum(propertyTypes),
  status: z.enum(propertyStatuses),
  price: z.number().finite().min(0).max(1_000_000_000_000),
  location: z.string().trim().min(2).max(180),
  description: z.string().trim().min(1).max(5000),
  imageUrl: optionalImageUrl,
  ...optionalPropertyFields,
  featured: z.boolean(),
};

const propertyInputSchema = z.object({
  title: propertyFields.title,
  type: propertyFields.type,
  status: propertyFields.status,
  price: propertyFields.price,
  location: propertyFields.location,
  description: propertyFields.description,
  imageUrl: propertyFields.imageUrl,
  ...optionalPropertyFields,
  featured: propertyFields.featured.optional(),
}).strict();

export const createPropertySchema = propertyInputSchema.refine(
  (value) => (value.latitude === undefined) === (value.longitude === undefined),
  { message: "Provide both latitude and longitude.", path: ["latitude"] },
);

export const updatePropertySchema = z.object({
  title: propertyFields.title.optional(),
  type: propertyFields.type.optional(),
  status: propertyFields.status.optional(),
  price: propertyFields.price.optional(),
  location: propertyFields.location.optional(),
  description: propertyFields.description.optional(),
  imageUrl: propertyFields.imageUrl,
  ...optionalPropertyFields,
  featured: propertyFields.featured.optional(),
}).strict()
  .refine((value) => Object.keys(value).length > 0, "Provide at least one property field to update.")
  .refine(
    (value) => (value.latitude === undefined) === (value.longitude === undefined),
    { message: "Provide both latitude and longitude.", path: ["latitude"] },
  );

export const propertyRequestSchema = propertyInputSchema.omit({ status: true, featured: true }).strict().refine(
  (value) => (value.latitude === undefined) === (value.longitude === undefined),
  { message: "Provide both latitude and longitude.", path: ["latitude"] },
);
export const userUpdateSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  isActive: z.boolean().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, "Provide a user field to update.");
export const contactStatusSchema = z.object({
  status: z.enum(["new", "reviewed", "closed"]),
}).strict();
export const propertyRequestStatusSchema = z.object({
  status: z.enum(["approved", "rejected"]),
}).strict();
const optionalHttpUrl = z.union([
  z.literal(""),
  z.string().trim().url().max(2048).refine((value) => /^https?:\/\//i.test(value), "Use an HTTP(S) URL."),
]);
export const siteSettingsSchema = z.object({
  websiteName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(3).max(30),
  emergencyPhone: z.string().trim().min(3).max(30),
  facebook: optionalHttpUrl,
  instagram: optionalHttpUrl,
  whatsapp: optionalHttpUrl,
}).strict();
export const websiteContentSchema = z.object({
  homeHeading: z.string().trim().min(2).max(160),
  homeSubheading: z.string().trim().min(2).max(500),
  aboutHeadline: z.string().trim().min(2).max(160),
  aboutContent: z.string().trim().min(2).max(2000),
}).strict();

export const contactSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  message: z.string().trim().min(10).max(5000),
  propertyId: z.string().regex(/^[a-f\d]{24}$/i, "Property ID is invalid.").optional(),
}).strict();

export const propertyQuerySchema = z.object({
  type: z.enum(propertyTypes).optional(),
  status: z.enum(propertyStatuses).optional(),
  minPrice: z.coerce.number().finite().min(0).optional(),
  maxPrice: z.coerce.number().finite().min(0).optional(),
  location: z.string().trim().max(180).optional(),
  featured: z.enum(["true", "false"]).transform((value) => value === "true").optional(),
  source: z.enum(["real", "sample"]).optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
}).strict().refine(
  (value) => value.minPrice === undefined || value.maxPrice === undefined || value.minPrice <= value.maxPrice,
  { message: "minPrice cannot be greater than maxPrice." },
);

export function parseInput(schema, input) {
  const result = schema.safeParse(input);
  if (!result.success) {
    const error = new Error("Please check the submitted information.");
    error.status = 400;
    error.details = result.error.issues.map(({ path, message }) => ({
      field: path.join("."),
      message,
    }));
    throw error;
  }
  return result.data;
}
