import type { Metadata } from 'next';
import { WebProviders } from '@/components/WebProviders';
import './globals.css';

export const metadata: Metadata = {
  title: 'Interview Agent',
  description: 'Agent-native 面试训练系统',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <WebProviders>{children}</WebProviders>
      </body>
    </html>
  );
}
