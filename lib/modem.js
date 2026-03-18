/**
 * GSM SMS Gateway — Huawei E303 HiLink Modem Service
 * 
 * Communicates with the Huawei E303 via its built-in HTTP API at 192.168.8.1.
 * In simulated mode, all calls return mock success responses.
 */

import config from './config.js';

/**
 * Get a session token and verification token from the modem.
 * Required before any API call.
 */
async function getSessionToken() {
  if (config.simulateModem) {
    return { sessionId: 'simulated-session', token: 'simulated-token' };
  }

  try {
    const res = await fetch(`${config.modem.baseUrl}/api/webserver/SesTokInfo`, {
      signal: AbortSignal.timeout(config.modem.timeout),
    });

    if (!res.ok) {
      throw new Error(`Modem returned status ${res.status}`);
    }

    const text = await res.text();

    // Parse XML response
    const sessionMatch = text.match(/<SesInfo>(.*?)<\/SesInfo>/);
    const tokenMatch = text.match(/<TokInfo>(.*?)<\/TokInfo>/);

    if (!sessionMatch || !tokenMatch) {
      throw new Error('Could not parse session/token from modem response');
    }

    return {
      sessionId: sessionMatch[1],
      token: tokenMatch[1],
    };
  } catch (err) {
    throw new Error(`Failed to connect to modem: ${err.message}`);
  }
}

/**
 * Send an SMS message through the Huawei E303 modem.
 * 
 * @param {string} phone - Recipient phone number
 * @param {string} message - Message text
 * @returns {object} - { success: boolean, error?: string }
 */
export async function sendSMS(phone, message) {
  if (config.simulateModem) {
    console.log(`[SIMULATED SMS] To: ${phone} | Message: ${message}`);
    // Simulate a small delay 
    await new Promise(resolve => setTimeout(resolve, 500));
    return { success: true, simulated: true };
  }

  try {
    const { sessionId, token } = await getSessionToken();

    // Build XML payload
    const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<request>
  <Index>-1</Index>
  <Phones>
    <Phone>${phone}</Phone>
  </Phones>
  <Sca></Sca>
  <Content>${escapeXml(message)}</Content>
  <Length>${message.length}</Length>
  <Reserved>1</Reserved>
  <Date>${new Date().toISOString().slice(0, 19).replace('T', ' ')}</Date>
</request>`;

    const res = await fetch(`${config.modem.baseUrl}/api/sms/send-sms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml',
        'Cookie': sessionId,
        '__RequestVerificationToken': token,
      },
      body: xmlBody,
      signal: AbortSignal.timeout(config.modem.timeout),
    });

    const responseText = await res.text();

    if (responseText.includes('<response>OK</response>')) {
      return { success: true };
    }

    // Try to extract error code
    const errorMatch = responseText.match(/<code>(\d+)<\/code>/);
    const errorCode = errorMatch ? errorMatch[1] : 'unknown';

    return { success: false, error: `Modem error code: ${errorCode}` };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Check modem connection status and signal strength.
 * 
 * @returns {object} - { connected, signalStrength, networkType, ... }
 */
export async function getModemStatus() {
  if (config.simulateModem) {
    return {
      connected: true,
      simulated: true,
      signalStrength: 80,
      networkType: 'Simulated 4G',
      simStatus: 'Ready',
    };
  }

  try {
    const res = await fetch(`${config.modem.baseUrl}/api/monitoring/status`, {
      signal: AbortSignal.timeout(config.modem.timeout),
    });

    if (!res.ok) {
      return { connected: false, error: `HTTP ${res.status}` };
    }

    const text = await res.text();

    // Parse signal strength (0-5 scale from modem, convert to percentage)
    const signalMatch = text.match(/<SignalIcon>(\d+)<\/SignalIcon>/);
    const signalLevel = signalMatch ? parseInt(signalMatch[1]) : 0;
    const signalStrength = Math.round((signalLevel / 5) * 100);

    // Parse network type
    const networkTypeMap = {
      0: 'No Service', 1: 'GSM', 2: 'GPRS', 3: 'EDGE',
      4: 'WCDMA', 5: 'HSDPA', 6: 'HSUPA', 7: 'HSPA+',
      8: 'LTE', 9: 'LTE-A',
    };
    const networkMatch = text.match(/<CurrentNetworkType>(\d+)<\/CurrentNetworkType>/);
    const networkCode = networkMatch ? parseInt(networkMatch[1]) : 0;
    const networkType = networkTypeMap[networkCode] || 'Unknown';

    // SIM status 
    const simMatch = text.match(/<SimStatus>(\d+)<\/SimStatus>/);
    const simReady = simMatch && simMatch[1] === '1';

    return {
      connected: true,
      signalStrength,
      networkType,
      simStatus: simReady ? 'Ready' : 'Not Ready',
    };
  } catch (err) {
    return { connected: false, error: err.message };
  }
}

/**
 * Escape XML special characters.
 */
function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
