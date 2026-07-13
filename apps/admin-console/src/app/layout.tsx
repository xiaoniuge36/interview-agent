import type { Metadata } from 'next';
import { AdminProviders } from '@/components/AdminProviders';
import './globals.css';

export const metadata: Metadata = {
  title: 'Interview Agent Governance Console',
  description: '面试资产、模型与 Agent 运行治理控制台',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <AdminProviders>{children}</AdminProviders>
      </body>
    </html>
  );
}
