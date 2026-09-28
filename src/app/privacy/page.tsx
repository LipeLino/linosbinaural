import type { Metadata } from 'next';
import { InfoPage } from '@/components/InfoPage';

export const metadata: Metadata = {
  title: 'Privacy',
  description: 'How Lino’s Binaural stores drafts, handles accounts and sharing, and protects payment and ad choices.',
  alternates: { canonical: '/builds/linosbinaural/privacy/' },
  openGraph: { title: 'Privacy · Lino’s Binaural', description: 'How Lino’s Binaural stores local drafts and keeps advertising, analytics, and payments out of this release.', url: 'https://www.mateuslino.com/builds/linosbinaural/privacy/' },
};

export default function Page() { return <InfoPage kind="privacy" />; }
