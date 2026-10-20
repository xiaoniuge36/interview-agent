'use client';

import { useEffect, useState } from 'react';
import type { AiInvocationPage, AiInvocationView, AiUsagePeriod } from '@interview-agent/contracts';
import { createLatestRequestRunner } from '@interview-agent/api-client';
import { getAiUsageInvocations } from '@/lib/ai-usage-api';

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_COMPACT = 10;
const PAGE_SIZE_COMFORTABLE = 20;
const PAGE_SIZE_DENSE = 50;
const PAGE_SIZE_OPTIONS = [PAGE_SIZE_COMPACT, PAGE_SIZE_COMFORTABLE, PAGE_SIZE_DENSE];
const TIME_PART_LENGTH = 2;

type PageState = {
  status: 'loading' | 'ready' | 'error';
  page: AiInvocationPage | null;
  message: string;
};

/** 调用明细：固定高度的表格 + 翻页，避免历史记录在设置页里无限堆叠。 */
export function AiUsageInvocationsTable({ period }: { period: AiUsagePeriod }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const state = useInvocationPage(period, page, pageSize);
  const current = state.page;
  const totalPages = current ? Math.max(1, Math.ceil(current.total / current.pageSize)) : 1;
  return (
    <section className="ai-usage-invocations" aria-labelledby="ai-usage-invocations-heading">
      <header className="ai-usage-invocations-heading">
        <h3 id="ai-usage-invocations-heading">调用明细</h3>
        <span>按时间倒序，可翻页查看该时间范围内的全部调用</span>
      </header>
      <InvocationsTable loading={state.status === 'loading'} page={current} />
      {state.status === 'error' ? <p className="settings-error">{state.message}</p> : null}
      {current ? (
        <Pagination
          onChangePage={setPage}
          onChangePageSize={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          page={current.page}
          pageSize={current.pageSize}
          total={current.total}
          totalPages={totalPages}
        />
      ) : null}
    </section>
  );
}

export function InvocationsTable({
  page,
  loading,
}: {
  page: AiInvocationPage | null;
  loading: boolean;
}) {
  return (
    <div className="ai-usage-table-scroll">
      <table aria-busy={loading} className="ai-usage-table">
        <caption className="ai-usage-visually-hidden">AI 调用明细</caption>
        <thead>
          <tr>
            <th scope="col">时间</th>
            <th scope="col">操作</th>
            <th scope="col">模型</th>
            <th scope="col">耗时</th>
            <th scope="col">Token</th>
            <th scope="col">状态</th>
          </tr>
        </thead>
        <tbody>
          <TableRows loading={loading} page={page} />
        </tbody>
      </table>
    </div>
  );
}

function TableRows({ page, loading }: { page: AiInvocationPage | null; loading: boolean }) {
  if (!page) {
    return <StateRow>{loading ? '正在读取调用记录…' : '该时间范围内没有调用记录。'}</StateRow>;
  }
  if (page.items.length === 0) return <StateRow>该时间范围内没有调用记录。</StateRow>;
  return page.items.map((item) => <InvocationRow item={item} key={item.id} />);
}

function StateRow({ children }: { children: string }) {
  return (
    <tr>
      <td className="ai-usage-table-state" colSpan={6}>
        {children}
      </td>
    </tr>
  );
}

function InvocationRow({ item }: { item: AiInvocationView }) {
  return (
    <tr>
      <td>
        <time dateTime={item.createdAt}>{formatTime(item.createdAt)}</time>
      </td>
      <td>{operationLabel(item.operation)}</td>
      <td className="ai-usage-table-model" title={`${item.provider} · ${item.model}`}>
        {item.model}
      </td>
      <td>{item.latencyMs === null ? '—' : `${item.latencyMs} ms`}</td>
      <td>{item.totalTokens === null ? '—' : formatNumber(item.totalTokens)}</td>
      <td>
        <span className={`ai-usage-status ${item.status}`}>{statusLabel(item.status)}</span>
      </td>
    </tr>
  );
}

function Pagination(props: {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onChangePage: (page: number) => void;
  onChangePageSize: (size: number) => void;
}) {
  return (
    <div className="ai-usage-pagination">
      <span>
        共 {formatNumber(props.total)} 条 · 第 {props.page} / {props.totalPages} 页
      </span>
      <label className="ai-usage-page-size">
        每页
        <select
          onChange={(event) => props.onChangePageSize(Number(event.target.value))}
          value={props.pageSize}
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        条
      </label>
      <div className="ai-usage-pagination-actions">
        <button
          disabled={props.page <= 1}
          onClick={() => props.onChangePage(props.page - 1)}
          type="button"
        >
          上一页
        </button>
        <button
          disabled={props.page >= props.totalPages}
          onClick={() => props.onChangePage(props.page + 1)}
          type="button"
        >
          下一页
        </button>
      </div>
    </div>
  );
}

function useInvocationPage(period: AiUsagePeriod, page: number, pageSize: number): PageState {
  const [state, setState] = useState<PageState>({ status: 'loading', page: null, message: '' });
  const [request] = useState(createLatestRequestRunner);
  useEffect(() => {
    setState((current) => ({ status: 'loading', page: current.page, message: '' }));
    void request.run({
      load: (signal) => getAiUsageInvocations({ period, page, pageSize }, signal),
      onError: (error) =>
        setState((current) => ({
          status: 'error',
          page: current.page,
          message: messageOf(error),
        })),
      onSuccess: (result) => setState({ status: 'ready', page: result, message: '' }),
    });
    return request.invalidate;
  }, [page, pageSize, period, request]);
  return state;
}

export function operationLabel(operation: AiInvocationView['operation']): string {
  if (operation === 'model_connection_test') return '连接测试';
  if (operation === 'practice_evaluation') return '单题评价';
  if (operation === 'practice_report') return '练习报告';
  if (operation === 'user_page_agent') return '训练助教';
  if (operation === 'admin_page_agent') return '后台助手';
  if (operation === 'embedding') return '向量化';
  return '模拟面试';
}

export function statusLabel(status: AiInvocationView['status']): string {
  if (status === 'succeeded') return '成功';
  if (status === 'cancelled') return '已取消';
  return '失败';
}

function formatTime(value: string): string {
  const date = new Date(value);
  const pad = (input: number) => String(input).padStart(TIME_PART_LENGTH, '0');
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}:${pad(date.getSeconds())}`;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('zh-CN').format(value);
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : '暂时无法读取调用明细，请稍后重试。';
}
