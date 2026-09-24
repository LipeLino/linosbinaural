import type { Metadata } from 'next';
import { InfoPage } from '@/components/InfoPage';

export const metadata: Metadata = {
  title: 'Privacy',
  description: 'How Lino’s Binaural stores drafts, handles accounts and sharing, and protects payment and ad choices.',
  alternates: { canonical: '/linosbinaural/privacy/' },
  openGraph: { title: 'Privacy · Lino’s Binaural', description: 'How Lino’s Binaural stores drafts, handles accounts and sharing, and protects payment and ad choices.', url: 'https://mateuslino.com/linosbinaural/privacy/' },
};

export default function Page() { return <InfoPage kind="privacy" />; }
