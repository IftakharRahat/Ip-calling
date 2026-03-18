/**
 * GSM SMS Gateway — Configuration
 * 
 * Central configuration for gateway connection, database, and API settings.
 * Supports: Android SMS Gateway app, Huawei E303 HiLink, or Simulated mode.
 */

const config = {
  // Gateway mode: 'simulate' | 'android' | 'hilink'
  gatewayMode: process.env.GATEWAY_MODE || 'simulate',

  // Android SMS Gateway app (recommended)
  // Install "SMS Gateway for Android" from Play Store
  // App runs HTTP server on the phone
  android: {
    baseUrl: process.env.ANDROID_GATEWAY_URL || 'http://192.168.0.101:8080',
    username: process.env.ANDROID_GATEWAY_USER || '',
    password: process.env.ANDROID_GATEWAY_PASS || '',
    timeout: 15000,
  },

  // Huawei E303 HiLink API (fallback if driver works)
  hilink: {
    baseUrl: process.env.MODEM_URL || 'http://192.168.8.1',
    timeout: 10000,
  },

  // Database
  db: {
    path: process.env.DB_PATH || './sms_gateway.db',
  },

  // API security
  api: {
    key: process.env.API_KEY || 'bright-tutor-beta-key',
  },
};

export default config;
