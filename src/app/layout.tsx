import type { Metadata } from 'next';
import './globals.css';
import './studio.css';
export const metadata:Metadata={title:'Margin — Contract intelligence, grounded in evidence',description:'Read, research, and compare legal contracts with verified source quotes.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
