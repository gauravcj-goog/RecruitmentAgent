/**
 * Runtime configuration for the frontend.
 * This file is loaded before app.js and defines the backend URL.
 * In production, this can be overwritten or generated from environment variables.
 */
window.APP_CONFIG = {
  /**
   * BACKEND_URL: The full WebSocket URL of the backend service.
   * If left empty, the application will attempt to connect to the current host.
   * Example: "wss://recruitment-agent-backend-787798151876.asia-south1.run.app"
   */
  BACKEND_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? "" // Fallback to current host for local development
    : "wss://recruitment-agent-backend-787798151876.asia-south1.run.app"
};
