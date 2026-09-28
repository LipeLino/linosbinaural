import type { Metadata } from 'next';
import { InfoPage } from '@/components/InfoPage';

export const metadata: Metadata = {
  title: 'How it works',
  description: 'How stereo binaural beats, ambience, mixing controls and session timers work.',
  alternates: { canonical: '/builds/linosbinaural/how-it-works/' },
  openGraph: { title: 'How it works · Lino’s Binaural', description: 'How stereo binaural beats, ambience, mixing controls and session timers work.', url: 'https://www.mateuslino.com/builds/linosbinaural/how-it-works/' },
};

export default function Page() { return <InfoPage kind="how-it-works" />; }
