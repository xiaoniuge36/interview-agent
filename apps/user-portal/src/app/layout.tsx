import type { Metadata } from 'next';
import { JetBrains_Mono, Noto_Sans_SC } from 'next/font/google';
import { WebProviders } from '@/components/WebProviders';
import './globals.css';

const chineseFont = Noto_Sans_SC({
  display: 'swap',
  preload: false,
  variable: '--font-chinese',
  weight: ['400', '500', '600', '700', '800', '900'],
});

const techFont = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-tech-face',
  weight: ['600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'Interview Agent · AI 面试训练',
  description: '面向互联网全岗位的 AI 面试训练平台，帮助你把真实经历练成有说服力的能力证据。',
};

const THEME_BOOTSTRAP_SCRIPT = `(()=>{const root=document.documentElement;const v2Key='offerpilot:theme-preferences:v2';const v1Key='offerpilot:theme-preferences:v1';const themes=['aurora','terminal','constructivist','daylight','glass','playground'];const legacyThemes={dawn:'daylight',ocean:'glass',night:'aurora'};let preferences={theme:'daylight',motion:true};try{const v2=JSON.parse(localStorage.getItem(v2Key)||'null');if(v2&&themes.includes(v2.theme)){preferences={theme:v2.theme,motion:v2.motion!==false};}else{const v1=JSON.parse(localStorage.getItem(v1Key)||'null');const theme=v1&&legacyThemes[v1.theme];if(theme)preferences={theme,motion:v1.motion!==false};}localStorage.setItem(v2Key,JSON.stringify(preferences));}catch{}root.dataset.theme=preferences.theme;root.dataset.motion=preferences.motion?'on':'off';delete root.dataset.accent;})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="zh-CN"
      className={`${chineseFont.variable} ${techFont.variable}`}
      data-theme="daylight"
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
