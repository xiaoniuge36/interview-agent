import Link from 'next/link';
import { formatDateTime } from '@/lib/format';
import {
  trainingRecordActionLabel,
  trainingRecordStatusLabel,
  type TrainingRecord,
} from './training-records-model';

/** 档案列表中的单条训练记录：整卡即入口，按状态给出下一步动作。 */
export function ArchiveRecord({ record }: { record: TrainingRecord }) {
  return (
    <Link className="training-archive-record motion-lift" href={record.href}>
      <span className="training-archive-record-mark" data-kind={record.kind} aria-hidden="true">
        {record.kind === 'practice' ? '题' : '面'}
      </span>
      <span className="training-archive-record-main">
        <small>
          {record.kind === 'practice' ? '刷题复盘' : '模拟面试'} ·{' '}
          {formatDateTime(record.updatedAt)}
        </small>
        <strong>{record.title}</strong>
        <span className="training-archive-record-facts">{record.facts.join(' · ')}</span>
        {record.signals.length ? (
          <span className="training-archive-record-signals">
            {record.signals.map((signal) => (
              <i key={signal}>{signal}</i>
            ))}
          </span>
        ) : null}
      </span>
      <span className="training-archive-record-result">
        {record.score !== null ? <b>{Math.round(record.score)}</b> : null}
        <small>
          {record.score !== null ? 'AI 复盘得分' : trainingRecordStatusLabel(record.status)}
        </small>
        {record.trend ? <TrainingScoreTrend trend={record.trend} /> : null}
        <em>{trainingRecordActionLabel(record.status)} →</em>
      </span>
    </Link>
  );
}

function TrainingScoreTrend({ trend }: { trend: NonNullable<TrainingRecord['trend']> }) {
  const tone = trend.delta > 0 ? 'up' : trend.delta < 0 ? 'down' : 'steady';
  const visible =
    trend.delta > 0 ? `较上一轮 +${trend.delta}` : `较上一轮 ${trend.delta || '持平'}`;
  return (
    <span
      className="training-archive-record-trend"
      data-tone={tone}
      aria-label={`上一轮 ${Math.round(trend.previousScore)} 分，${visible}`}
    >
      {visible}
    </span>
  );
}
