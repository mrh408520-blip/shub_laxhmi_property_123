import { Router } from "express";

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

export function createSiteRouter(siteConfig) {
  const router = Router();
  router.get("/", async (_req, res, next) => {
    try {
      const [settings, content] = await Promise.all([
        siteConfig.get("settings"),
        siteConfig.get("content"),
      ]);
      res.json({
        settings: settings ?? defaultSettings,
        content: content ?? defaultContent,
      });
    } catch (error) {
      next(error);
    }
  });
  return router;
}
