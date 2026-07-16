import { Typography } from 'antd';
import { QuestionAssetsTable } from './QuestionAssetsTable';

export function QuestionReviewPanels({
  active,
  refreshKey,
}: {
  active: boolean;
  refreshKey: number;
}) {
  return (
    <section className="admin-page" id="section-2" aria-labelledby="questions-heading">
      <div className="admin-page-heading">
        <div>
          <Typography.Text type="secondary">题库治理</Typography.Text>
          <Typography.Title id="questions-heading" level={2}>
            正式题库管理
          </Typography.Title>
        </div>
        <Typography.Paragraph type="secondary">
          查看已发布题目与当前可见范围；候选题审核请前往审核工作台。
        </Typography.Paragraph>
      </div>
      <QuestionAssetsTable active={active} refreshKey={refreshKey} />
    </section>
  );
}
