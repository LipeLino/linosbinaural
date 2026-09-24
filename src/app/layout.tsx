import type {Metadata} from 'next';
import '@fontsource-variable/nunito';
import '@fontsource/pixelify-sans/latin-500.css';
import './globals.css';
import {AppProvider} from '@/components/AppProvider';
import {Shell} from '@/components/Shell';
export const metadata:Metadata={metadataBase:new URL('https://mateuslino.com'),title:{default:'Lino’s Binaural — your woodland listening room',template:'%s · Lino’s Binaural'},description:'Make a little room for yourself. Free binaural beats, natural ambience and personal listening mixes.',alternates:{canonical:'/linosbinaural/'},icons:{icon:'/linosbinaural/art/mark.svg'},openGraph:{title:'Lino’s Binaural',description:'A little room for your mind. A free binaural and ambience mixer.',url:'https://mateuslino.com/linosbinaural/',images:['/linosbinaural/art/social.png']}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" data-theme="night"><body><AppProvider><Shell>{children}</Shell></AppProvider></body></html>;}
