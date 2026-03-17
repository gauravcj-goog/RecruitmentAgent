/**
 * Runtime configuration for the frontend.
 * This file is loaded before app.js and defines the backend URL.
 * In production, this can be overwritten or generated from environment variables.
 */
window.APP_CONFIG = {
  // Default to current host for local development if not specified
  // In production, this should be the full URL of the backend (e.g., "wss://backend-xyz.a.run.app")
  BACKEND_URL: "wss://recruitment-agent-backend-787798151876.asia-south1.run.app"
};
