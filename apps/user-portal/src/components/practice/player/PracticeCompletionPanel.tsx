import type { MasteryProfile, PracticeReport, PracticeSession } from '@interview-agent/contracts';
import Link from 'next/link';
import { PracticeReportPanel } from '../PracticeReportPanel';

type PracticeCompletionPanelProps = {
  session: PracticeSession;
  report: PracticeReport | null;
  mastery: MasteryProfile[];
  message: string;
  onRetry: () => void;
};

export function PracticeCompletionPanel(props: PracticeCompletionPanelProps) {
  const hasReport = props.session.status === 'report_ready' && props.report;
  return (
    <div className="practice-completion-page">
      <header>
        <span>{hasReport ? 'AI review complete' : 'Self-study complete'}</span>
        <h1>{hasReport ? '本轮 AI 复盘已生成' : '本轮自学已结束'}</h1>
        <p>{hasReport
          ? '逐题评价已汇总为能力记录，并会影响下一次 Agent 推荐。'
          : '本轮没有生成 AI 分数和 mastery 记录，你的回答仍已安全保留。'}</p>
        <div><Link href="/questions">开始新的题单</Link><Link href="/home">返回题库大厅</Link></div>
      </header>
      {hasReport ? <PracticeReportPanel report={props.report!} mastery={props.mastery} /> : null}
      {props.session.status === 'report_ready' && !props.report ? (
        <button className="practice-report-retry" type="button" onClick={props.onRetry}>重新加载本轮复盘</button>
      ) : null}
      {props.message ? <p className="practice-completion-message">{props.message}</p> : null}
    </div>
  );
}
