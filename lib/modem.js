/**
 * GSM SMS Gateway — Multi-Gateway Modem Service
 * 
 * Supports three gateway modes:
 * 1. simulate  — Fake sends for development (default)
 * 2. android   — Android SMS Gateway app (recommended for production)
 * 3. hilink    — Huawei E303 HiLink HTTP API (if driver works)
 */

import config from './config.js';

// ═══════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════

/**
 * Send an SMS message through the configured gateway.
 */
export async function sendSMS(phone, message) {
  switch (config.gatewayMode) {
    case 'android':
      return sendViaAndroid(phone, message);
    case 'hilink':
      return sendViaHiLink(phone, message);
    case 'simulate':
    default:
      return sendSimulated(phone, message);
  }
}

/**
 * Get gateway connection status.
 */
export async function getModemStatus() {
  switch (config.gatewayMode) {
    case 'android':
      return getAndroidStatus();
    case 'hilink':
      return getHiLinkStatus();
    case 'simulate':
    default:
      return {
        connected: true,
        simulated: true,
        signalStrength: 80,
        networkType: 'Simulated',
        gatewayMode: 'simulate',
      };
  }
}

// ═══════════════════════════════════════════
// SIMULATED MODE
// ═══════════════════════════════════════════

async function sendSimulated(phone, message) {
  console.log(`[SIMULATED SMS] To: ${phone} | Message: ${message}`);
  await new Promise(resolve => setTimeout(resolve, 500));
  return { success: true, simulated: true };
}

// ═══════════════════════════════════════════
// ANDROID SMS GATEWAY
// ═══════════════════════════════════════════

/**
 * Send SMS via "SMS Gateway for Android" app.
 * API: POST http://<phone-ip>:8080/message
 */
async function sendViaAndroid(phone, message) {
  try {
    const headers = {
      'Content-Type': 'application/json',
    };

    // Add Basic Auth if credentials are configured
    if (config.android.username && config.android.password) {
      const credentials = Buffer.from(`${config.android.username}:${config.android.password}`).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
    }

    const res = await fetch(`${config.android.baseUrl}/message`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message: message,
        phoneNumbers: [phone],
      }),
      signal: AbortSignal.timeout(config.android.timeout),
    });

    if (res.ok) {
      const data = await res.json();
      return { success: true, data };
    }

    const errorText = await res.text();
    return { success: false, error: `Android Gateway error (${res.status}): ${errorText}` };
  } catch (err) {
    return { success: false, error: `Android Gateway unreachable: ${err.message}` };
  }
}

/**
 * Check Android SMS Gateway status.
 */
async function getAndroidStatus() {
  try {
    const headers = {};
    if (config.android.username && config.android.password) {
      const credentials = Buffer.from(`${config.android.username}:${config.android.password}`).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
    }

    const res = await fetch(`${config.android.baseUrl}`, {
      signal: AbortSignal.timeout(5000),
      headers,
    });

    if (res.ok) {
      return {
        connected: true,
        gatewayMode: 'android',
        networkType: 'Android Phone',
        signalStrength: 100,
        simStatus: 'Ready',
        gatewayUrl: config.android.baseUrl,
      };
    }

    return { connected: false, gatewayMode: 'android', error: `HTTP ${res.status}` };
  } catch (err) {
    return { connected: false, gatewayMode: 'android', error: err.message };
  }
}

// ═══════════════════════════════════════════
// HUAWEI E303 HILINK
// ═══════════════════════════════════════════

/**
 * Get HiLink session token + verification token.
 */
async function getHiLinkSessionToken() {
  const res = await fetch(`${config.hilink.baseUrl}/api/webserver/SesTokInfo`, {
    signal: AbortSignal.timeout(config.hilink.timeout),
  });

  if (!res.ok) throw new Error(`Modem returned status ${res.status}`);

  const text = await res.text();
  const sessionMatch = text.match(/<SesInfo>(.*?)<\/SesInfo>/);
  const tokenMatch = text.match(/<TokInfo>(.*?)<\/TokInfo>/);

  if (!sessionMatch || !tokenMatch) {
    throw new Error('Could not parse session/token from modem');
  }

  return { sessionId: sessionMatch[1], token: tokenMatch[1] };
}

/**
 * Send SMS via Huawei E303 HiLink API.
 */
async function sendViaHiLink(phone, message) {
  try {
    const { sessionId, token } = await getHiLinkSessionToken();

    const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<request>
  <Index>-1</Index>
  <Phones><Phone>${phone}</Phone></Phones>
  <Sca></Sca>
  <Content>${escapeXml(message)}</Content>
  <Length>${message.length}</Length>
  <Reserved>1</Reserved>
  <Date>${new Date().toISOString().slice(0, 19).replace('T', ' ')}</Date>
</request>`;

    const res = await fetch(`${config.hilink.baseUrl}/api/sms/send-sms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml',
        'Cookie': sessionId,
        '__RequestVerificationToken': token,
      },
      body: xmlBody,
      signal: AbortSignal.timeout(config.hilink.timeout),
    });

    const responseText = await res.text();

    if (responseText.includes('<response>OK</response>')) {
      return { success: true };
    }

    const errorMatch = responseText.match(/<code>(\d+)<\/code>/);
    return { success: false, error: `Modem error: ${errorMatch ? errorMatch[1] : 'unknown'}` };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Check Huawei E303 HiLink status.
 */
async function getHiLinkStatus() {
  try {
    const res = await fetch(`${config.hilink.baseUrl}/api/monitoring/status`, {
      signal: AbortSignal.timeout(config.hilink.timeout),
    });

    if (!res.ok) return { connected: false, gatewayMode: 'hilink', error: `HTTP ${res.status}` };

    const text = await res.text();

    const signalMatch = text.match(/<SignalIcon>(\d+)<\/SignalIcon>/);
    const signalLevel = signalMatch ? parseInt(signalMatch[1]) : 0;

    const networkTypeMap = {
      0: 'No Service', 1: 'GSM', 2: 'GPRS', 3: 'EDGE',
      4: 'WCDMA', 5: 'HSDPA', 6: 'HSUPA', 7: 'HSPA+',
      8: 'LTE', 9: 'LTE-A',
    };
    const networkMatch = text.match(/<CurrentNetworkType>(\d+)<\/CurrentNetworkType>/);
    const networkCode = networkMatch ? parseInt(networkMatch[1]) : 0;

    return {
      connected: true,
      gatewayMode: 'hilink',
      signalStrength: Math.round((signalLevel / 5) * 100),
      networkType: networkTypeMap[networkCode] || 'Unknown',
      simStatus: 'Ready',
    };
  } catch (err) {
    return { connected: false, gatewayMode: 'hilink', error: err.message };
  }
}

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
