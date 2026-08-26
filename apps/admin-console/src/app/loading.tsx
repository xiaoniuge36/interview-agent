'use client';

import { Skeleton } from 'antd';

const STAT_CARD_KEYS = ['imports', 'questions', 'runs', 'accounts'] as const;
const TABLE_PARAGRAPH_ROWS = 6;
const RAIL_PARAGRAPH_ROWS = 4;

/** 控制台路由加载骨架：页头 + 指标卡 + 主表格区，与 antd 视觉体系一致。 */
export default function AdminRouteLoading() {
  return (
    <main className="admin-route-loading" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">正在载入治理控制台</span>

      <header className="admin-route-loading-header" aria-hidden="true">
        <Skeleton.Input active size="large" />
        <Skeleton.Button active />
      </header>

      <div className="admin-route-loading-stats" aria-hidden="true">
        {STAT_CARD_KEYS.map((key) => (
          <div key={key} className="admin-route-loading-card">
            <Skeleton active paragraph={{ rows: 1 }} title={{ width: '52%' }} />
          </div>
        ))}
      </div>

      <div className="admin-route-loading-body" aria-hidden="true">
        <div className="admin-route-loading-card">
          <Skeleton active paragraph={{ rows: TABLE_PARAGRAPH_ROWS }} title={{ width: '32%' }} />
        </div>
        <div className="admin-route-loading-card">
          <Skeleton active paragraph={{ rows: RAIL_PARAGRAPH_ROWS }} title={{ width: '44%' }} />
        </div>
      </div>
    </main>
  );
}
