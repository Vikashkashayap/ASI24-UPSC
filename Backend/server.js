/**
 * PM2 / legacy entry point.
 * loadEnv MUST run before src/server.js imports passport (via auth routes).
 */
import "./src/loadEnv.js";
import "./src/server.js";
