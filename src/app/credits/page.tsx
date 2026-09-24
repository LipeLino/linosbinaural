import type { Metadata } from 'next';
import { InfoPage } from '@/components/InfoPage';

export const metadata: Metadata = {
  title: 'Credits',
  description: 'Original artwork, licensed field recordings, procedural noise and self-hosted open fonts.',
  alternates: { canonical: '/linosbinaural/credits/' },
  openGraph: { title: 'Credits · Lino’s Binaural', description: 'Original artwork, licensed field recordings, procedural noise and self-hosted open fonts.', url: 'https://mateuslino.com/linosbinaural/credits/' },
};

export default function Page() { return <InfoPage kind="credits" />; }
