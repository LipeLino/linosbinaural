import type { Metadata } from 'next';
import { InfoPage } from '@/components/InfoPage';

export const metadata: Metadata = {
  title: 'The evidence',
  description: 'A careful look at binaural beat perception, proposed entrainment and the limits of current research.',
  alternates: { canonical: '/linosbinaural/evidence/' },
  openGraph: { title: 'The evidence · Lino’s Binaural', description: 'A careful look at binaural beat perception, proposed entrainment and the limits of current research.', url: 'https://mateuslino.com/linosbinaural/evidence/' },
};

export default function Page() { return <InfoPage kind="evidence" />; }
