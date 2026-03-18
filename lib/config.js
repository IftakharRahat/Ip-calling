/**
 * GSM SMS Gateway — Configuration
 * 
 * Central configuration for modem connection, database, and API settings.
 */

const config = {
  // Huawei E303 HiLink API
  modem: {
    baseUrl: process.env.MODEM_URL || 'http://192.168.8.1',
    timeout: 10000, // 10 seconds
  },

  // Set to true for development without physical modem
  simulateModem: process.env.SIMULATE_MODEM !== 'false', // default: true

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
