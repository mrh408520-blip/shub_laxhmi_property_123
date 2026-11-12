import { Router } from "express";
import { createAuthenticate, createRequireAdmin } from "../middleware/authenticate.js";
import {
  createPropertySchema,
  parseInput,
  propertyQuerySchema,
  updatePropertySchema,
} from "../validation.js";

export function createPropertyRouter({ authService, propertyService }) {
  const router = Router();
  const authenticate = createAuthenticate(authService);

  router.get("/", async (req, res, next) => {
    try {
      const filters = parseInput(propertyQuerySchema, req.query);
      res.json(await propertyService.list(filters));
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id", async (req, res, next) => {
    try {
      res.json({ data: await propertyService.get(req.params.id) });
    } catch (error) {
      next(error);
    }
  });

  router.post("/", authenticate, createRequireAdmin(), async (req, res, next) => {
    try {
      const input = parseInput(createPropertySchema, req.body);
      res.status(201).json({ data: await propertyService.create(req.user.id, input) });
    } catch (error) {
      next(error);
    }
  });

  router.patch("/:id", authenticate, createRequireAdmin(), async (req, res, next) => {
    try {
      const input = parseInput(updatePropertySchema, req.body);
      res.json({ data: await propertyService.update(req.user.id, req.params.id, input) });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:id", authenticate, createRequireAdmin(), async (req, res, next) => {
    try {
      await propertyService.delete(req.user.id, req.params.id);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  return router;
}
