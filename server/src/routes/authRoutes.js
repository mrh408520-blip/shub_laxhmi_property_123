import { Router } from "express";
import { COOKIE_NAME } from "../constants.js";
import { loginSchema, parseInput, registerSchema } from "../validation.js";

function setSessionCookie(res, session, config) {
  res.cookie(COOKIE_NAME, session.token, {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: "lax",
    path: "/",
    maxAge: session.expiresAt - Date.now(),
  });
}

export function createAuthRouter({ authService, config }) {
  const router = Router();

  router.post("/register", async (req, res, next) => {
    try {
      const input = parseInput(registerSchema, req.body);
      const result = await authService.register(input);
      setSessionCookie(res, result.session, config);
      res.status(201).json({ user: result.user });
    } catch (error) {
      next(error);
    }
  });

  router.post("/login", async (req, res, next) => {
    try {
      const input = parseInput(loginSchema, req.body);
      const result = await authService.login(input);
      setSessionCookie(res, result.session, config);
      res.json({ user: result.user });
    } catch (error) {
      next(error);
    }
  });

  router.post("/admin/login", async (req, res, next) => {
    try {
      const input = parseInput(loginSchema, req.body);
      const result = await authService.adminLogin(input);
      setSessionCookie(res, result.session, config);
      res.json({ user: result.user });
    } catch (error) {
      next(error);
    }
  });

  router.get("/me", async (req, res, next) => {
    try {
      const user = await authService.getUser(req.cookies?.[COOKIE_NAME]);
      return res.json({ user });
    } catch (error) {
      return next(error);
    }
  });

  router.post("/logout", async (req, res, next) => {
    try {
      const token = req.cookies?.[COOKIE_NAME];
      await authService.logout(token);
      res.clearCookie(COOKIE_NAME, {
        httpOnly: true,
        secure: config.cookieSecure,
        sameSite: "lax",
        path: "/",
      });
      return res.status(204).end();
    } catch (error) {
      return next(error);
    }
  });

  return router;
}
