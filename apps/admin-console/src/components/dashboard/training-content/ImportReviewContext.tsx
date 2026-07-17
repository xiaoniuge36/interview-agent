'use client';

import { FileSearchOutlined, ReadOutlined } from '@ant-design/icons';
import { Card, Collapse, Empty, Spin, Tag, Typography } from 'antd';
import type { ImportReviewContext as ReviewContext } from '@interview-agent/contracts';
import React, { useEffect, useState } from 'react';
import { getImportReviewContext } from '@/lib/training-content-api';
import { sourceChunkPresentation, sourceChunksForCandidate } from './import-review-context-model';

type ImportReviewContextProps = {
  active: boolean;
  importTaskId?: string | undefined;
  sourceRefs?: string[] | undefined;
};

type ReviewContextState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; context: ReviewContext }
  | { status: 'error' };

export function ImportReviewContext({
  active,
  importTaskId,
  sourceRefs,
}: ImportReviewContextProps) {
  const state = useReviewContext(active, importTaskId);
  if (!active || !importTaskId) return null;
  if (state.status === 'loading' || state.status === 'idle')
    return <LoadingContext focused={sourceRefs !== undefined} />;
  if (state.status === 'error') return <FailedContext focused={sourceRefs !== undefined} />;
  return sourceRefs ? (
    <CandidateSourceEvidence context={state.context} sourceRefs={sourceRefs} />
  ) : (
    <BatchSourceOverview context={state.context} />
  );
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

function LoadingContext({ focused }: { focused: boolean }) {
  return (
    <Card className="admin-import-review-context" size="small" title={contextTitle(focused)}>
      <div className="admin-import-review-loading">
        <Spin description={focused ? '正在定位本题原文依据' : '正在读取本批导入资料'} />
      </div>
    </Card>
  );
}

function FailedContext({ focused }: { focused: boolean }) {
  return (
    <Card className="admin-import-review-context" size="small" title={contextTitle(focused)}>
      <Empty
        description={
          focused ? '暂时无法定位本题的原文依据。' : '暂时无法读取这批候选题的来源资料。'
        }
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    </Card>
  );
}

function contextTitle(focused: boolean) {
  return focused ? '本题原文依据' : '本批导入资料';
}

export function BatchSourceOverview({ context }: { context: ReviewContext }) {
  const { sourceChunks, task } = context;
  return (
    <Card
      className="admin-import-review-context"
      extra={<Tag color="processing">待审核 {task.candidateCount} 道</Tag>}
      size="small"
      title="本批导入资料"
    >
      <BatchGuide sourceChunkCount={sourceChunks.length} title={task.title} />
    </Card>
  );
}

function BatchGuide({ sourceChunkCount, title }: { sourceChunkCount: number; title: string }) {
  return (
    <div className="admin-import-review-guide">
      <FileSearchOutlined aria-hidden />
      <div>
        <Typography.Text strong>{title}</Typography.Text>
        <Typography.Paragraph type="secondary">
          本批候选题由这份资料自动提取。打开任意候选题后，会自动定位到对应的原文依据。
        </Typography.Paragraph>
        <div className="admin-import-review-guide-meta">
          <ReadOutlined aria-hidden />
          <Typography.Text type="secondary">原文已拆分为 {sourceChunkCount} 个段落</Typography.Text>
        </div>
      </div>
    </div>
  );
}

export function CandidateSourceEvidence({
  context,
  sourceRefs,
}: {
  context: ReviewContext;
  sourceRefs: string[];
}) {
  const chunks = sourceChunksForCandidate(context.sourceChunks, sourceRefs);
  return (
    <Card
      className="admin-import-review-context"
      extra={<Tag color="processing">已定位 {chunks.length} 段</Tag>}
      size="small"
      title="本题原文依据"
    >
      <CandidateEvidenceGuide title={context.task.title} />
      {chunks.length ? <SourceChunks chunks={chunks} focused /> : <MissingEvidence />}
    </Card>
  );
}

function CandidateEvidenceGuide({ title }: { title: string }) {
  return (
    <div className="admin-import-review-guide">
      <FileSearchOutlined aria-hidden />
      <div>
        <Typography.Text strong>{title}</Typography.Text>
        <Typography.Paragraph type="secondary">
          以下仅展示生成当前候选题时记录的原文段落，可直接核对题干、答案和评分点。
        </Typography.Paragraph>
      </div>
    </div>
  );
}

function MissingEvidence() {
  return <Empty description="本题未记录可定位的原文段落，请按需查看本批导入资料。" />;
}

export function SourceChunks({
  chunks,
  focused = false,
}: {
  chunks: ReviewContext['sourceChunks'];
  focused?: boolean;
}) {
  return (
    <Collapse
      className="admin-import-source-list"
      defaultActiveKey={[String(chunks[0]?.sequence)]}
      items={chunks.map((chunk) => sourceChunkItem(chunk, chunks.length, focused))}
      size="small"
    />
  );
}

function sourceChunkItem(
  chunk: ReviewContext['sourceChunks'][number],
  total: number,
  focused: boolean,
) {
  const presentation = sourceChunkPresentation(chunk, total);
  return {
    key: String(chunk.sequence),
    label: (
      <div className="admin-import-source-label">
        <div>
          <Typography.Text strong>
            {focused ? `资料段落 ${chunk.sequence}` : presentation.title}
          </Typography.Text>
          <Typography.Text className="admin-import-source-preview" type="secondary">
            {presentation.preview}
          </Typography.Text>
        </div>
        <Tag>{presentation.characterCount} 字</Tag>
      </div>
    ),
    children: (
      <div className="admin-import-source-fulltext">
        <Typography.Text type="secondary">完整原文</Typography.Text>
        <Typography.Paragraph className="admin-import-source-content">
          {chunk.content}
        </Typography.Paragraph>
      </div>
    ),
  };
}
