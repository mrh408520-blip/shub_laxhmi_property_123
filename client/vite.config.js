import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const allowedHosts = [
    "mobility-nested-tigers-register.trycloudflare.com",
    ...(env.VITE_ALLOWED_HOSTS ?? "").split(",").map((host) => host.trim()).filter(Boolean),
  ];

  return {
    plugins: [react()],
    server: {
      strictPort: true,
      allowedHosts: [...new Set(allowedHosts)],
      proxy: {
        "/api": "http://localhost:3001",
        "/uploads": "http://localhost:3001",
      },
    },
  };
});
