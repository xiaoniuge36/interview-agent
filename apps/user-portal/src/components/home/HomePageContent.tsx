'use client';

import { HeroSection } from './HeroSection';
import { WorkspaceGate } from '@/components/workspace/WorkspaceGate';

/** 首页只保留用户此刻最需要的准备路径，行动入口由 HeroSection 根据真实数据生成。 */
export function HomePageContent() {
  return (
    <WorkspaceGate>
      {(data) => (
        <div className="home-workspace">
          <HeroSection profile={data.profile} jobs={data.jobs} interviews={data.interviews} />
        </div>
      )}
    </WorkspaceGate>
  );
}
