'use client';

import { useEffect, type CSSProperties } from 'react';

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/** 根级错误兜底：独立于全局样式渲染，使用内联样式保证任何情况下可读可操作。 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error('[global-error]', error);
  }, [error]);

  return (
    <html lang="zh-CN" data-theme="daylight" data-motion="on">
      <body style={styles.body}>
        <main style={styles.panel} role="alert">
          <span style={styles.eyebrow}>INTERVIEW AGENT</span>
          <h1 style={styles.title}>应用遇到了问题</h1>
          <p style={styles.detail}>页面无法继续渲染。你可以重试，或刷新浏览器后重新进入。</p>
          {error.digest ? <code style={styles.digest}>错误编号：{error.digest}</code> : null}
          <button style={styles.button} type="button" onClick={reset}>
            重试
          </button>
        </main>
      </body>
    </html>
  );
}

const styles: Record<string, CSSProperties> = {
  body: {
    margin: 0,
    minHeight: '100vh',
    display: 'grid',
    placeItems: 'center',
    padding: '24px',
    background: '#f6f7f3',
    color: '#101219',
    fontFamily: "'PingFang SC', 'Microsoft YaHei', sans-serif",
  },
  panel: {
    width: 'min(460px, 100%)',
    padding: '34px 36px',
    border: '2px solid #d8dce4',
    borderRadius: '4px',
    background: '#ffffff',
    boxShadow: '10px 12px 0 rgba(16, 18, 25, 0.12)',
  },
  eyebrow: {
    color: '#2457ff',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.1em',
  },
  title: {
    margin: '10px 0 8px',
    fontSize: '26px',
    letterSpacing: '-0.04em',
    lineHeight: 1.2,
  },
  detail: {
    margin: 0,
    color: '#606877',
    fontSize: '14px',
    lineHeight: 1.7,
  },
  digest: {
    display: 'block',
    margin: '14px 0 0',
    color: '#606877',
    fontSize: '12px',
  },
  button: {
    marginTop: '22px',
    minHeight: '44px',
    padding: '0 26px',
    border: '2px solid #2457ff',
    borderRadius: '3px',
    background: '#2457ff',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
  },
};
