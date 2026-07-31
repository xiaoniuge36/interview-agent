import type { PracticeReport } from '@interview-agent/contracts';

export function ReportEvidence({ evidence = [] }: Pick<PracticeReport, 'evidence'>) {
  if (!evidence.length) return null;
  return (
    <details className="practice-report-evidence">
      <summary>查看本轮参考来源（{evidence.length}）</summary>
      <ul>
        {evidence.map((item, index) => (
          <li key={item.sourceId}>受控知识来源 {index + 1}</li>
        ))}
      </ul>
      <p>来源仅用于辅助复盘，报告事实仍以本轮已验证评价为准。</p>
    </details>
  );
}
