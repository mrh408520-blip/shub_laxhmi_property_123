import { Router } from "express";
import { createAuthenticate } from "../middleware/authenticate.js";
import { parseInput, propertyRequestSchema } from "../validation.js";

export function createPropertyRequestRouter({ authService, propertyRequests }) {
  const router = Router();
  router.use(createAuthenticate(authService));

  router.post("/", async (req, res, next) => {
    try {
      const input = parseInput(propertyRequestSchema, req.body);
      const request = await propertyRequests.create(req.user.id, input);
      res.status(201).json({ data: request });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
