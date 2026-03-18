# GSM SMS Gateway — Bright Tutor

A local SMS gateway application that integrates with the Bright Tutor CRM platform. Sends SMS messages through **Huawei E303** USB modems using the HiLink HTTP API.

## How It Works

1. CRO selects a user and message in the **CRM Sender** page
2. System automatically queues the message
3. CRO **verifies** the message on the **Dashboard**
4. CRO clicks **Confirm & Send** — SMS is delivered via local GSM modem

## Tech Stack

- **Next.js 16** — Full-stack framework (API routes + frontend)
- **Huawei E303 HiLink API** — SMS sending via HTTP (`192.168.8.1`)
- **SQLite** — Local message logging via `better-sqlite3`
- **Vanilla CSS** — Premium dark theme UI

## Getting Started

### Prerequisites

- Node.js 18+
- Huawei E303 USB modem with active SIM card

### Installation

```bash
npm install
```

### Development (Simulated Mode)

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the verification dashboard.
Open [http://localhost:3000/sender](http://localhost:3000/sender) for the CRM sender page.

### Production with GSM Modem

1. Plug in your Huawei E303 modem
2. Verify modem is accessible at `http://192.168.8.1`
3. Set `SIMULATE_MODEM=false` in `lib/config.js`
4. Run the application

## License

Private — Bright Tutor
