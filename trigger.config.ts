import { defineConfig } from "@trigger.dev/sdk/v3";

if (!process.env.TRIGGER_PROJECT_ID) {
  throw new Error("TRIGGER_PROJECT_ID environment variable is required");
}

export default defineConfig({
  project: process.env.TRIGGER_PROJECT_ID,
  runtime: "node",
  logLevel: "info",
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
  dirs: ["./trigger"],
  maxDuration: 300000, // 5 minutes (was 5000 = 5 seconds)
});
