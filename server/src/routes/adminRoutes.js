import { Router } from "express";
import { createAuthenticate, createRequireAdmin } from "../middleware/authenticate.js";
import express from "express";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  contactStatusSchema,
  propertyQuerySchema,
  parseInput,
  propertyRequestStatusSchema,
  siteSettingsSchema,
  updatePropertySchema,
  userUpdateSchema,
  websiteContentSchema,
} from "../validation.js";

const defaultSettings = {
  websiteName: "Shubh Lakshmi Properties",
  email: "main123@gmail.com",
  phone: "+91-XXXXXXXXXX",
  emergencyPhone: "+91-XXXXXXXXXX",
  facebook: "",
  instagram: "",
  whatsapp: "",
};
const defaultContent = {
  homeHeading: "Find Your Dream Property",
  homeSubheading: "Bringing prosperity and success to your real estate journey with trusted properties across the globe",
  aboutHeadline: "Ready to Find Your Perfect Property?",
  aboutContent: "Join thousands of satisfied customers who found their dream homes with us",
};

function createHttpError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function imageType(buffer) {
  if (buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "png";
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "jpg";
  if (buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return "webp";
  return null;
}

export function createAdminRouter({
  authService,
  propertyService,
  propertyRequests,
  users,
  contacts,
  siteConfig,
  uploadDirectory,
}) {
  const router = Router();

  router.use(createAuthenticate(authService));
  router.use(createRequireAdmin());

  router.get("/me", (req, res) => {
    res.json({ user: req.user });
  });

  router.get("/overview", async (_req, res, next) => {
    try {
      const [propertyResult, userList, enquiryList, requestList] = await Promise.all([
        propertyService.list({ page: 1, limit: 1 }),
        users.list(),
        contacts.list(),
        propertyRequests.list(),
      ]);
      res.json({
        stats: {
          totalProperties: propertyResult.pagination.total,
          totalUsers: userList.length,
          totalEnquiries: enquiryList.length,
          totalUploadRequests: requestList.filter((item) => item.status === "pending").length,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/properties", async (req, res, next) => {
    try {
      const filters = parseInput(propertyQuerySchema, { ...req.query, limit: req.query.limit ?? 50 });
      res.json(await propertyService.list(filters));
    } catch (error) {
      next(error);
    }
  });

  router.patch("/properties/:id", async (req, res, next) => {
    try {
      const input = parseInput(updatePropertySchema, req.body);
      res.json({ data: await propertyService.update(req.user.id, req.params.id, input, true) });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/properties/:id", async (req, res, next) => {
    try {
      await propertyService.delete(req.user.id, req.params.id, true);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  router.get("/property-requests", async (_req, res, next) => {
    try {
      res.json({ data: await propertyRequests.list() });
    } catch (error) {
      next(error);
    }
  });

  router.patch("/property-requests/:id", async (req, res, next) => {
    try {
      const input = parseInput(propertyRequestStatusSchema, req.body);
      const propertyRequest = await propertyRequests.findById(req.params.id);
      if (!propertyRequest) throw createHttpError("Property request not found.", 404);
      if (propertyRequest.status !== "pending") {
        throw createHttpError("This request has already been reviewed.", 409);
      }
      let propertyId = null;
      if (input.status === "approved") {
        const property = await propertyService.create(propertyRequest.user.id, {
          title: propertyRequest.title,
          type: propertyRequest.type,
          status: "available",
          price: propertyRequest.price,
          location: propertyRequest.location,
          description: propertyRequest.description,
          ...(propertyRequest.imageUrl ? { imageUrl: propertyRequest.imageUrl } : {}),
          imageUrls: propertyRequest.imageUrls,
          bedrooms: propertyRequest.bedrooms,
          bathrooms: propertyRequest.bathrooms,
          areaSqFt: propertyRequest.areaSqFt,
          parking: propertyRequest.parking,
          floor: propertyRequest.floor,
          address: propertyRequest.address,
          latitude: propertyRequest.latitude,
          longitude: propertyRequest.longitude,
          highlights: propertyRequest.highlights,
          amenities: propertyRequest.amenities,
          facilities: propertyRequest.facilities,
          additionalDetails: propertyRequest.additionalDetails,
          nearbyLocations: propertyRequest.nearbyLocations,
        });
        propertyId = property.id;
      }
      const updated = await propertyRequests.updateStatus(req.params.id, input.status, propertyId);
      res.json({ data: updated });
    } catch (error) {
      next(error);
    }
  });

  router.get("/users", async (_req, res, next) => {
    try {
      res.json({ data: await users.list() });
    } catch (error) {
      next(error);
    }
  });

  router.patch("/users/:id", async (req, res, next) => {
    try {
      const input = parseInput(userUpdateSchema, req.body);
      const existing = (await users.list()).find((user) => user.id === req.params.id);
      if (!existing) throw createHttpError("User not found.", 404);
      if (existing.role === "admin" && input.isActive === false) {
        throw createHttpError("Administrator accounts cannot be deactivated here.", 403);
      }
      const user = await users.update(req.params.id, input);
      res.json({ user });
    } catch (error) {
      next(error);
    }
  });

  router.get("/contacts", async (_req, res, next) => {
    try {
      res.json({ data: await contacts.list() });
    } catch (error) {
      next(error);
    }
  });

  router.patch("/contacts/:id", async (req, res, next) => {
    try {
      const { status } = parseInput(contactStatusSchema, req.body);
      const contact = await contacts.updateStatus(req.params.id, status);
      if (!contact) throw createHttpError("Contact enquiry not found.", 404);
      res.json({ data: contact });
    } catch (error) {
      next(error);
    }
  });

  router.get("/site-settings", async (_req, res, next) => {
    try {
      res.json({ data: { settings: (await siteConfig.get("settings")) ?? defaultSettings, content: (await siteConfig.get("content")) ?? defaultContent } });
    } catch (error) {
      next(error);
    }
  });

  router.put("/site-settings", async (req, res, next) => {
    try {
      const settings = parseInput(siteSettingsSchema, req.body);
      res.json({ data: await siteConfig.set("settings", settings) });
    } catch (error) {
      next(error);
    }
  });

  router.put("/website-content", async (req, res, next) => {
    try {
      const content = parseInput(websiteContentSchema, req.body);
      res.json({ data: await siteConfig.set("content", content) });
    } catch (error) {
      next(error);
    }
  });

  router.post(
    "/property-images",
    express.raw({ type: ["image/jpeg", "image/png", "image/webp"], limit: "5mb" }),
    async (req, res, next) => {
      try {
        if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
          throw createHttpError("Choose a JPEG, PNG, or WebP image to upload.", 400);
        }
        const extension = imageType(req.body);
        if (!extension) throw createHttpError("The uploaded file is not a supported image.", 400);
        await mkdir(uploadDirectory, { recursive: true });
        const fileName = `${randomUUID()}.${extension}`;
        await writeFile(path.join(uploadDirectory, fileName), req.body, { flag: "wx" });
        res.status(201).json({ imageUrl: `/uploads/${fileName}` });
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
