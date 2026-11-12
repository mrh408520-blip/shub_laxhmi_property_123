import { Router } from "express";
import { contactSchema, parseInput } from "../validation.js";

export function createContactRouter(contactService) {
  const router = Router();
  router.post("/", async (req, res, next) => {
    try {
      const input = parseInput(contactSchema, req.body);
      res.status(201).json({
        message: "Your message has been received. We will be in touch soon.",
        submission: await contactService.submit(input),
      });
    } catch (error) {
      next(error);
    }
  });
  return router;
}
