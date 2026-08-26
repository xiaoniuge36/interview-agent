import React from 'react';

const DEFAULT_TICKER_ITEMS = [
  '上下文工程',
  '检索增强生成',
  '工具调用',
  '智能体记忆',
  '面试证据',
  '训练复盘',
] as const;

export function ChineseTicker({ items = DEFAULT_TICKER_ITEMS }: { items?: readonly string[] }) {
  return (
    <div className="chinese-ticker" aria-label="训练主题滚动字幕">
      <div className="chinese-ticker-track">
        <TickerQueue items={items} />
        <TickerQueue items={items} hidden />
      </div>
    </div>
  );
}

function TickerQueue({ items, hidden = false }: { items: readonly string[]; hidden?: boolean }) {
  return (
    <ul className="chinese-ticker-queue" aria-hidden={hidden ? 'true' : undefined}>
      {items.map((item) => (
        <li key={item}>
          <span aria-hidden="true" />
          {item}
        </li>
      ))}
    </ul>
  );
}
