import type { CandidateQuestionDetail, CandidateReview } from '@interview-agent/contracts';

export function candidateUpdateInput(detail: CandidateQuestionDetail) {
  return {
    title: detail.title,
    stem: detail.stem,
    answer: detail.answer,
    tags: detail.tags,
    status: detail.status,
    reviewNotes: detail.reviewNotes,
  };
}

export function splitTags(value: string) {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

const COMPANY_TAG_PREFIX = 'company:';

/** 从混合 tags 中拆出能力标签与公司名（company: 前缀是 C 端公司筛选的存储约定）。 */
export function splitCompanyTags(tags: string[]) {
  const plain: string[] = [];
  const companies: string[] = [];
  tags.forEach((tag) => {
    if (tag.startsWith(COMPANY_TAG_PREFIX)) {
      const company = tag.slice(COMPANY_TAG_PREFIX.length).trim();
      if (company) companies.push(company);
      return;
    }
    plain.push(tag);
  });
  return { plain, companies };
}

export function mergeCompanyTags(plain: string[], companies: string[]) {
  return [...plain, ...companies.map((company) => `${COMPANY_TAG_PREFIX}${company}`)];
}

export function statusLabel(status: CandidateReview['status']) {
  return {
    pending: '待审核',
    needs_edit: '需修改',
    approved: '已通过',
    rejected: '已拒绝',
  }[status];
}

export function canPublishCandidate(status: CandidateReview['status']): boolean {
  return status === 'approved';
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : '操作失败，请稍后重试。';
}
