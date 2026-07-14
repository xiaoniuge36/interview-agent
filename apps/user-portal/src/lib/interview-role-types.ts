export type RoleGroup =
  | '工程研发'
  | '数据与 AI'
  | '产品与设计'
  | '增长与运营'
  | '市场与商业'
  | '项目与交付';

export type RoleTemplate = {
  group: RoleGroup;
  title: string;
  jdText: string;
  companyContext: string;
  communicationText: string;
  focusTags: string[];
};

export function defineRole(role: RoleTemplate): RoleTemplate {
  return role;
}
