import type { Metadata } from 'next';
import { InfoPage } from '@/components/InfoPage';

export const metadata: Metadata = {
  title: 'Terms of use',
  description: 'Terms for free creative listening in Lino’s Binaural.',
  alternates: { canonical: '/builds/linosbinaural/terms/' },
  openGraph: { title: 'Terms of use · Lino’s Binaural', description: 'Terms for free creative listening in Lino’s Binaural.', url: 'https://www.mateuslino.com/builds/linosbinaural/terms/' },
};

export default function Page() { return <InfoPage kind="terms" />; }
