// Node 20.12+ loads optional local configuration without overriding deployment
// environment variables. This file executes before database/provider imports.
import process from "node:process";
try {
  process.loadEnvFile?.(".env");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
