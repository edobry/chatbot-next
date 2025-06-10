/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  // Enable source maps for debugging
  productionBrowserSourceMaps: false,
  serverExternalPackages: ["ai"],
};

export default config;
