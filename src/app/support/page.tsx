import type { Metadata } from 'next';
import { InfoPage } from '@/components/InfoPage';

export const metadata: Metadata = {
  title: 'Support',
  description: 'Listening-room help and the status of a future optional tip jar.',
  alternates: { canonical: '/builds/linosbinaural/support/' },
  openGraph: { title: 'Support · Lino’s Binaural', description: 'Listening-room help and the status of a future optional tip jar.', url: 'https://www.mateuslino.com/builds/linosbinaural/support/' },
};

export default function Page() { return <InfoPage kind="support" />; }
