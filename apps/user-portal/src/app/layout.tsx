import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { WebProviders } from '@/components/WebProviders';
import './globals.css';

const uiFont = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-ui',
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'OfferPilot · AI 面试训练',
  description: '面向互联网全岗位的 AI 面试训练平台，帮助你把真实经历练成有说服力的能力证据。',
};

const THEME_BOOTSTRAP_SCRIPT = `(()=>{try{const key='offerpilot:theme-preferences:v1';const value=JSON.parse(localStorage.getItem(key)||'{}');const themes=['dawn','ocean','night'];const accents=['coral','blue','teal','amber'];const root=document.documentElement;root.dataset.theme=themes.includes(value.theme)?value.theme:'dawn';root.dataset.accent=accents.includes(value.accent)?value.accent:'coral';root.dataset.motion=value.motion===false?'off':'on';}catch{}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="zh-CN"
      className={uiFont.variable}
      data-theme="dawn"
      data-accent="coral"
      data-motion="on"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
      </head>
      <body>
        <WebProviders>{children}</WebProviders>
      </body>
    </html>
  );
}
