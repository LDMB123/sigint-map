import { readFile } from 'node:fs/promises';
import path from 'node:path';
import LegacyDashboard from '../src/components/LegacyDashboard.jsx';

const dashboardMarkupPromise = readFile(
  path.join(process.cwd(), 'src', 'legacy', 'dashboard.html'),
  'utf8',
);

export default async function Page() {
  const markup = await dashboardMarkupPromise;

  return <LegacyDashboard markup={markup} />;
}
