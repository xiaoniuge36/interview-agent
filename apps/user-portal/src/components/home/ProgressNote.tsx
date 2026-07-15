import Link from 'next/link';
import type { DashboardModel } from './dashboard-types';

export function ProgressNote({ model }: { model: DashboardModel }) {
  const copy =
    model.completed > 0
      ? `已完成 ${model.completed} 次复盘，保持节奏，下一轮会围绕你的薄弱点继续追问。`
      : '档案、岗位与练习记录会持续写入 Agent memory，让下一轮追问更贴合你的真实经历。';
  return (
    <div className="dashboard-progress-note">
      <span aria-hidden="true">✦</span>
      <p>{copy}</p>
      <Link href={model.action.href}>查看进度 ›</Link>
    </div>
  );
}
