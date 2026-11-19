import type { Metadata } from 'next';
import { CreditsView } from '@/components/views/MiscViews';
import { DB } from '@/lib/server/catalog';

export const metadata: Metadata = { title: 'Written & composed by him' };

export default function CreditsPage() {
  return <CreditsView credits={DB.credits} />;
}
