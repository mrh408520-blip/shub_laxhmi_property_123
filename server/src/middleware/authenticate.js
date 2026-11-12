import { COOKIE_NAME } from "../constants.js";

export function createAuthenticate(authService) {
  return async (req, res, next) => {
    try {
      const user = await authService.getUser(req.cookies?.[COOKIE_NAME]);
      if (!user) {
        return res.status(401).json({ error: "Authentication required." });
      }
      if (!user.isActive) {
        return res.status(403).json({ error: "This account is inactive." });
      }
      req.user = user;
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

export function createRequireAdmin() {
  return (req, res, next) => {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required." });
    }
    return next();
  };
}
