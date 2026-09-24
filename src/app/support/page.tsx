import type { Metadata } from 'next';
import { InfoPage } from '@/components/InfoPage';

export const metadata: Metadata = {
  title: 'Support',
  description: 'Account and purchase help and a way to report problematic public mixes.',
  alternates: { canonical: '/linosbinaural/support/' },
  openGraph: { title: 'Support · Lino’s Binaural', description: 'Account and purchase help and a way to report problematic public mixes.', url: 'https://mateuslino.com/linosbinaural/support/' },
};

export default function Page() { return <InfoPage kind="support" />; }
