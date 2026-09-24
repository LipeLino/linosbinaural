import type { Metadata } from 'next';
import { InfoPage } from '@/components/InfoPage';

export const metadata: Metadata = {
  title: 'Terms of use',
  description: 'Free listening, private and public mixes, and the optional one-time ad-free purchase.',
  alternates: { canonical: '/linosbinaural/terms/' },
  openGraph: { title: 'Terms of use · Lino’s Binaural', description: 'Free listening, private and public mixes, and the optional one-time ad-free purchase.', url: 'https://mateuslino.com/linosbinaural/terms/' },
};

export default function Page() { return <InfoPage kind="terms" />; }
