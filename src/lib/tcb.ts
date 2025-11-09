
import cloudbase from "@cloudbase/node-sdk";

// Ensure the environment ID is configured, but allow for client-side execution
// where process.env might not be available.
const envId = typeof process !== 'undefined' ? process.env.CLOUDBASE_ENV_ID : 'YOUR_ENV_ID';

let app;

try {
  app = cloudbase.init({
    env: envId!,
  });
} catch (e) {
    console.error("Cloudbase initialization failed:", e);
    // In a client-side context, we might not want to throw an error immediately,
    // but rather handle it gracefully.
    app = null;
}


const auth = app ? app.auth() : null;
const db = app ? app.database() : null;

export { app, auth, db };
