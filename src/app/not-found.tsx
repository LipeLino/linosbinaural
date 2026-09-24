'use client';
import Link from 'next/link';
import {useApp} from '@/components/AppProvider';
export default function NotFound(){const {tr}=useApp();return <main id="main" className="content-page"><span className="eyebrow">404</span><h1>{tr('A path back to the room.','Um caminho de volta à sala.')}</h1><p>{tr('This page could not be found. Your listening mix is still here.','Esta página não foi encontrada. Seu mix continua aqui.')}</p><Link href="/" className="button primary">{tr('Back to listening','Voltar a ouvir')}</Link></main>;}
