import type { Metadata } from 'next';
import { JetBrains_Mono, Noto_Sans_SC } from 'next/font/google';
import { WebProviders } from '@/components/WebProviders';
import {
  DEFAULT_THEME_PREFERENCES,
  LEGACY_THEME_STORAGE_KEY,
  LEGACY_THEME_MAP,
  THEME_STORAGE_KEY,
  THEMES,
} from '@/components/theme/theme-preferences';
import './globals.css';

const chineseFont = Noto_Sans_SC({
  display: 'swap',
  preload: false,
  variable: '--font-chinese',
  weight: ['400', '500', '700'],
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

/** 首屏防闪烁主题引导脚本：常量与 theme-preferences.ts 单一事实源，渲染时内联注入。 */
const THEME_BOOTSTRAP_SCRIPT = `(()=>{const root=document.documentElement;const v2Key=${JSON.stringify(THEME_STORAGE_KEY)};const v1Key=${JSON.stringify(LEGACY_THEME_STORAGE_KEY)};const themes=${JSON.stringify(THEMES)};const legacyThemes=${JSON.stringify(LEGACY_THEME_MAP)};let preferences=${JSON.stringify(DEFAULT_THEME_PREFERENCES)};try{const v2=JSON.parse(localStorage.getItem(v2Key)||'null');if(v2&&themes.includes(v2.theme)){preferences={theme:v2.theme,motion:v2.motion!==false};}else{const v1=JSON.parse(localStorage.getItem(v1Key)||'null');const theme=v1&&legacyThemes[v1.theme];if(theme)preferences={theme,motion:v1.motion!==false};}localStorage.setItem(v2Key,JSON.stringify(preferences));}catch{}root.dataset.theme=preferences.theme;root.dataset.motion=preferences.motion?'on':'off';delete root.dataset.accent;})();`;

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
