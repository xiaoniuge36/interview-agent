'use client';

import { Card, Collapse, Empty, Spin, Tag, Typography } from 'antd';
import type { ImportReviewContext as ReviewContext } from '@interview-agent/contracts';
import { useEffect, useState } from 'react';
import { getImportReviewContext } from '@/lib/training-content-api';

type ImportReviewContextProps = {
  active: boolean;
  importTaskId?: string | undefined;
};

type ReviewContextState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; context: ReviewContext }
  | { status: 'error' };

export function ImportReviewContext({ active, importTaskId }: ImportReviewContextProps) {
  const state = useReviewContext(active, importTaskId);
  if (!active || !importTaskId) return null;
  if (state.status === 'loading' || state.status === 'idle') return <LoadingContext />;
  if (state.status === 'error') return <FailedContext />;
  return <ReadyContext context={state.context} />;
}

function useReviewContext(active: boolean, importTaskId: string | undefined) {
  const [state, setState] = useState<ReviewContextState>({ status: 'idle' });
  useEffect(() => {
    if (!active || !importTaskId) {
      setState({ status: 'idle' });
      return;
    }
    let mounted = true;
    setState({ status: 'loading' });
    void getImportReviewContext(importTaskId)
      .then((context) => mounted && setState({ status: 'ready', context }))
      .catch(() => mounted && setState({ status: 'error' }));
    return () => {
      mounted = false;
    };
  }, [active, importTaskId]);
  return state;
}

function LoadingContext() {
  return (
    <Card className="admin-import-review-context" size="small" title="导入资料">
      <div className="admin-import-review-loading">
        <Spin description="正在加载导入资料" />
      </div>
    </Card>
  );
}

function FailedContext() {
  return (
    <Card className="admin-import-review-context" size="small" title="导入资料">
      <Empty description="暂无可展示的导入资料。" image={Empty.PRESENTED_IMAGE_SIMPLE} />
    </Card>
  );
}

function ReadyContext({ context }: { context: ReviewContext }) {
  const { sourceChunks, task } = context;
  return (
    <Card
      className="admin-import-review-context"
      extra={<Tag color="processing">{task.candidateCount} 道候选题</Tag>}
      size="small"
      title={`导入资料 · ${task.title}`}
    >
      <Typography.Paragraph type="secondary">
        来源任务：<Typography.Text code>{task.id}</Typography.Text>
      </Typography.Paragraph>
      {sourceChunks.length ? <SourceChunks chunks={sourceChunks} /> : <Empty description="该任务没有可展示的原文片段。" />}
    </Card>
  );
}

function SourceChunks({ chunks }: { chunks: ReviewContext['sourceChunks'] }) {
  return (
    <Collapse
      defaultActiveKey={[String(chunks[0]?.sequence)]}
      items={chunks.map((chunk) => ({
        key: String(chunk.sequence),
        label: `原文片段 ${chunk.sequence}`,
        children: <Typography.Paragraph className="admin-import-source-content">{chunk.content}</Typography.Paragraph>,
      }))}
      size="small"
    />
  );
}
