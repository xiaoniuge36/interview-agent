import type { Question } from '@interview-agent/contracts';
import { Card, Empty, Space, Table, Tag, Typography, type TableColumnsType } from 'antd';
import { useAdminListExport } from '@/hooks/useAdminListExport';
import { useAdminPagedList, type AdminPagedListController } from '@/hooks/useAdminPagedList';
import { AdminPagination, AdminTableToolbar } from './AdminTableControls';
import { SectionFeedback } from './SectionState';

const STATUS_OPTIONS = [
  { value: 'all', label: '全部状态' },
  { value: 'published', label: '已发布' },
  { value: 'draft', label: '草稿' },
  { value: 'disabled', label: '已停用' },
  { value: 'archived', label: '已归档' },
] as const;
const DIFFICULTY_OPTIONS = [
  { value: 'all', label: '全部难度' },
  { value: 'intro', label: '入门' },
  { value: 'easy', label: '简单' },
  { value: 'medium', label: '中等' },
  { value: 'hard', label: '困难' },
  { value: 'expert', label: '专家' },
] as const;
const TYPE_LABELS: Record<Question['type'], string> = {
  short_answer: '简答题',
  coding: '编程题',
  system_design: '系统设计',
  project_deep_dive: '项目深挖',
  behavioral: '行为面试',
};
const QUESTION_STATUS_COLORS = {
  draft: 'default',
  published: 'success',
  disabled: 'error',
  archived: 'default',
} as const;

export function QuestionAssetsTable({
  active,
  refreshKey,
}: {
  active: boolean;
  refreshKey: number;
}) {
  const list = useAdminPagedList('questions', { enabled: active, reloadKey: refreshKey });
  const { exportList, isExporting } = useAdminListExport('questions', list.submittedQuery);
  return (
    <Card className="admin-table-card" size="small" title="正式题库">
      <Typography.Paragraph className="card-description" type="secondary">
        查看公开题目与当前租户题目的发布状态。
      </Typography.Paragraph>
      <QuestionListContent exportList={exportList} isExporting={isExporting} list={list} />
    </Card>
  );
}

type QuestionListContentProps = {
  exportList: () => Promise<void>;
  isExporting: boolean;
  list: AdminPagedListController<'questions'>;
};

function QuestionListContent({ exportList, isExporting, list }: QuestionListContentProps) {
  if (list.state.status !== 'ready')
    return <SectionFeedback state={list.state} loadingMessage="正在加载题库" />;
  const page = list.state.data;
  return (
    <>
      <QuestionToolbar
        exportList={exportList}
        isExporting={isExporting}
        list={list}
        total={page.total}
      />
      <QuestionTable questions={page.items} />
      <AdminPagination
        page={page.page}
        pageSize={page.pageSize}
        total={page.total}
        onChange={list.setPage}
        onPageSizeChange={list.setPageSize}
      />
    </>
  );
}

type QuestionToolbarProps = QuestionListContentProps & { total: number };

function QuestionToolbar({ exportList, isExporting, list, total }: QuestionToolbarProps) {
  return (
    <AdminTableToolbar
      filters={[
        {
          label: '状态',
          value: list.draftQuery.status ?? 'all',
          options: STATUS_OPTIONS,
          onChange: (value) => updateQuestionStatus(list.setDraftQuery, value),
        },
        {
          label: '难度',
          value: list.draftQuery.difficulty ?? 'all',
          options: DIFFICULTY_OPTIONS,
          onChange: (value) => updateQuestionDifficulty(list.setDraftQuery, value),
        },
      ]}
      isExporting={isExporting}
      isLoading={list.isLoading}
      query={list.draftQuery.keyword ?? ''}
      resultLabel={`共 ${total} 条`}
      searchLabel="搜索题目或正文"
      onExport={() => void exportList()}
      onQuery={list.query}
      onQueryChange={(keyword) => list.setDraftQuery((current) => ({ ...current, keyword }))}
      onReset={list.reset}
    />
  );
}

function updateQuestionStatus(
  setDraftQuery: ReturnType<typeof useAdminPagedList<'questions'>>['setDraftQuery'],
  value: string,
) {
  setDraftQuery((current) => ({
    ...current,
    status: value === 'all' ? undefined : (value as Question['status']),
  }));
}

function updateQuestionDifficulty(
  setDraftQuery: ReturnType<typeof useAdminPagedList<'questions'>>['setDraftQuery'],
  value: string,
) {
  setDraftQuery((current) => ({
    ...current,
    difficulty: value === 'all' ? undefined : (value as Question['difficulty']),
  }));
}

function QuestionTable({ questions }: { questions: Question[] }) {
  if (!questions.length)
    return <Empty description="没有匹配的题目" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  return (
    <Table<Question>
      columns={QUESTION_COLUMNS}
      dataSource={questions}
      pagination={false}
      rowKey="id"
      scroll={{ x: 900 }}
      size="middle"
    />
  );
}

const QUESTION_COLUMNS: TableColumnsType<Question> = [
  {
    title: '题目',
    key: 'title',
    width: 340,
    render: (_, question) => (
      <Space direction="vertical" size={0}>
        <Typography.Text strong>{question.title}</Typography.Text>
        <Typography.Text type="secondary">
          {question.tags.length ? question.tags.join(' · ') : '未标注标签'}
        </Typography.Text>
      </Space>
    ),
  },
  {
    title: '题型',
    dataIndex: 'type',
    width: 140,
    render: (_, question) => TYPE_LABELS[question.type],
  },
  {
    title: '难度',
    dataIndex: 'difficulty',
    width: 112,
    render: (_, question) => difficultyLabel(question.difficulty),
  },
  {
    title: '可见范围',
    dataIndex: 'visibility',
    width: 120,
    render: (_, question) => (question.visibility === 'public' ? '公开' : '当前租户'),
  },
  {
    title: '状态',
    dataIndex: 'status',
    width: 112,
    render: (_, question) => (
      <Tag color={QUESTION_STATUS_COLORS[question.status]}>{statusLabel(question.status)}</Tag>
    ),
  },
];

function difficultyLabel(value: Question['difficulty']): string {
  return { intro: '入门', easy: '简单', medium: '中等', hard: '困难', expert: '专家' }[value];
}

function statusLabel(value: Question['status']): string {
  return { draft: '草稿', published: '已发布', disabled: '已停用', archived: '已归档' }[value];
}
