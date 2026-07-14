import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { AdminProviders } from '@/components/AdminProviders';
import './globals.css';

const uiFont = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-ui',
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'Interview Agent · 治理控制台',
  description: '面试资产、模型与 Agent 运行治理控制台',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className={uiFont.variable}>
      <body>
        <AdminProviders>{children}</AdminProviders>
      </body>
    </html>
  );
}