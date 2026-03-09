import './globals.css';

const TITLE = 'SIGINT-MAP // Operation Epic Fury';
const DESCRIPTION =
  'Real-time 4D conflict tracker — aircraft, seismic, thermal, maritime, radiation, and OSINT feeds rendered on a WebGL globe.';

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  applicationName: 'SIGINT-MAP',
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: 'website',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#060a10',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="dark">
      <body className="sigint-app">{children}</body>
    </html>
  );
}
