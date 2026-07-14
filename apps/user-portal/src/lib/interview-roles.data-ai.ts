import { defineRole, type RoleTemplate } from './interview-role-types';

const GROUP = '数据与 AI' as const;

export const DATA_AI_ROLE_TEMPLATES: RoleTemplate[] = [
  defineRole({
    group: GROUP,
    title: '数据分析师',
    jdText: '围绕业务目标完成指标体系、专题分析和实验评估，把分散数据转化为可执行的增长与经营建议。',
    companyContext: '业务需要更快识别增长瓶颈，团队希望通过统一口径与高质量分析支持关键决策。',
    communicationText: '从问题定义、数据口径、分析路径到建议落地讲完整，说明结论如何被验证并产生结果。',
    focusTags: ['指标体系', '业务分析', '实验设计', '数据表达'],
  }),
  defineRole({
    group: GROUP,
    title: '数据工程师',
    jdText: '负责数据采集、ETL/ELT、数仓建模和数据服务建设，保障数据链路及时、准确、稳定且可追溯。',
    companyContext: '数据源不断增加，团队需要在质量、时效与成本之间建立规范的数据生产与治理体系。',
    communicationText: '说明你如何设计分层模型、治理数据质量、定位链路问题，并服务分析或算法下游需求。',
    focusTags: ['数仓建模', '数据治理', '数据链路', '成本优化'],
  }),
  defineRole({
    group: GROUP,
    title: 'BI 分析师',
    jdText: '负责经营看板、数据自助和管理层洞察，把核心指标口径、预警机制和决策场景连接起来。',
    companyContext: '管理层需要更实时地理解经营变化，团队希望降低取数成本并提升日常决策效率。',
    communicationText: '强调看板不是报表堆叠，说明你如何选择关键指标、处理口径冲突并推动业务行动。',
    focusTags: ['经营分析', '指标口径', '数据可视化', '决策支持'],
  }),
  defineRole({
    group: GROUP,
    title: '算法工程师',
    jdText: '负责推荐、排序、预测或搜索等算法能力建设，完成数据特征、模型训练、线上实验和效果迭代闭环。',
    companyContext: '业务希望通过智能决策提升转化与效率，团队需要兼顾离线指标、在线效果和工程可落地性。',
    communicationText: '用完整案例说明目标函数、特征或模型选择、实验结果及失败复盘，避免只讲模型结构。',
    focusTags: ['模型设计', '特征工程', '线上实验', '效果评估'],
  }),
  defineRole({
    group: GROUP,
    title: '机器学习工程师',
    jdText: '负责机器学习模型的训练、部署、监控和持续迭代，推动模型能力从实验环境稳定进入线上业务。',
    companyContext: '团队已有多个模型原型，当前挑战是提高线上可靠性、数据闭环效率和跨团队协作效率。',
    communicationText: '重点阐述 MLOps、模型监控、数据漂移处理和线上回滚方案，并关联业务收益。',
    focusTags: ['MLOps', '模型部署', '模型监控', '业务落地'],
  }),
  defineRole({
    group: GROUP,
    title: 'AI Agent 工程师',
    jdText: '负责 AI Agent、RAG 与工具调用链路设计，把大模型能力组合为可靠、可评估、可运营的业务产品。',
    companyContext: '团队正从 Demo 走向生产应用，需要处理模型效果、成本、安全、稳定性与人工协同等问题。',
    communicationText: '描述提示词、检索、工具编排和评测体系如何协同，明确失败兜底和对业务目标的贡献。',
    focusTags: ['Agent 设计', 'RAG', '模型评测', '生产化'],
  }),
];