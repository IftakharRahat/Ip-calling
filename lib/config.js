/**
 * GSM SMS Gateway — Configuration
 * 
 * Central configuration for gateway connection, database, and API settings.
 * Supports: Traccar Android Gateway, Huawei E303 HiLink, or Simulated mode.
 */

const config = {
  // Gateway mode: 'simulate' | 'traccar' | 'android' | 'hilink'
  gatewayMode: process.env.GATEWAY_MODE || 'traccar',

  // Traccar SMS Gateway (recommended - installed on Android phone)
  // Install "Traccar SMS Gateway" from Play Store
  traccar: {
    baseUrl: process.env.TRACCAR_URL || 'http://192.168.0.107:8082',
    token: process.env.TRACCAR_TOKEN || '322a55d8-c9bf-44d2-9b0e-3664fd8a5091',
    timeout: 15000,
  },

  // Generic Android SMS Gateway app (alternative)
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
