import './globals.css';

export const metadata = {
  title: 'GSM SMS Gateway — Bright Tutor',
  description: 'Local SMS gateway for sending messages through Huawei E303 GSM modem',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
