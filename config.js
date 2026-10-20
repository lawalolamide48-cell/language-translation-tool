/**
 * Application settings.
 * Change `provider` to switch translation services.
 *
 *  - "mymemory": free, no API key needed (limit: about 500 characters per request).
 *  - "google":   Google Cloud Translation API v2. Requires an API key.
 *                Get one at https://console.cloud.google.com/ (enable "Cloud Translation API").
 *
 * Note: a key placed in front-end code is visible to anyone. For a real deployment,
 * restrict the key to your domain or send requests through your own server.
 */
const CONFIG = {
  provider: "mymemory",
  googleApiKey: "YOUR_GOOGLE_API_KEY",
  maxChars: 500,
  defaultSource: "auto",
  defaultTarget: "fr"
};
