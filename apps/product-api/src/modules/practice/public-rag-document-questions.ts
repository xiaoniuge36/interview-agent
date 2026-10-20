import {
  buildAgentOpenQuestion,
  type AgentOpenQuestionInput,
} from './public-agent-question-builders';

const RAGAS_METRICS = 'https://docs.ragas.io/en/stable/concepts/metrics/';
const LANGSMITH_EVAL = 'https://docs.langchain.com/langsmith/evaluation';
const GRAPHRAG = 'https://arxiv.org/abs/2404.16130';
const UNSTRUCTURED = 'https://docs.unstructured.io/';
const LLAMAPARSE = 'https://docs.llamaindex.ai/en/stable/llama_cloud/llama_parse/';
const AZURE_DI = 'https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/';
const PADDLEOCR = 'https://github.com/PaddlePaddle/PaddleOCR';
const TESSERACT = 'https://github.com/tesseract-ocr/tesseract';

const QUESTIONS: AgentOpenQuestionInput[] = [
  {
    suffix: 'retrieval-kg-extraction-evaluation',
    title: '如何评估大模型抽取实体和关系的准确性？',
    stem: '说明标注口径、指标设计、评估集构建、LLM-as-judge 的校准方法和常见偏差。',
    type: 'project_deep_dive',
    difficulty: 'hard',
    answer:
      '先定 schema 和标注规范：实体类型、边界、别名、关系方向和跨句是否允许。' +
      '按文档类型、长度和领域分层抽样构建黄金集，至少几百条，双人标注加仲裁，报告标注一致率。' +
      '指标分三层：实体级 P/R/F1（严格匹配和别名归一后的宽松匹配分开报）、' +
      '关系级 P/R/F1（头尾实体和关系类型都对才算）、三元组 exact match；' +
      '再加端到端下游指标，如图谱查询命中率和最终答案正确率。' +
      'LLM-as-judge 只能辅助，必须用人工标注校准一致率和混淆矩阵，固定 prompt 与模型版本，' +
      '抽样复核，并注意位置偏差、长度偏差和领域漂移。' +
      '报告要带样本量、置信区间和失败类型，不能只报一个孤立的准确率。',
    tags: ['RAG', '知识图谱', '信息抽取', '评测'],
    points: ['标注口径与黄金集', '分层指标设计', 'Judge 校准与报告规范'],
    sourceRefs: [RAGAS_METRICS, LANGSMITH_EVAL, GRAPHRAG],
  },
  {
    suffix: 'retrieval-kg-extraction-numbers',
    title: '你的实体或关系抽取准确率具体是多少？评估怎么做的？',
    stem:
      '给出可复现的数字口径（数据集、样本量、匹配规则、模型版本），' +
      '并说明离线数字为什么不能直接代表线上效果。',
    type: 'project_deep_dive',
    difficulty: 'hard',
    answer:
      '我会先给口径再给数字，例如：在 500 条分层抽样的中文技术文档上，实体严格匹配 F1 0.86、' +
      '关系 F1 0.78；别名归一后的宽松匹配为实体 0.92、关系 0.85；抽取模型和 prompt 版本固定，' +
      '双人标注一致率 0.9。然后说明局限：黄金集只覆盖有限领域和文档类型，' +
      '表格、跨句、超长文档上通常更差；离线 F1 不等于下游答案准确率，' +
      '要看图谱查询命中率和最终正确率；线上靠抽样人工复核和失败样本回流持续修正。' +
      '如果项目没有系统评估过，我会诚实说明“只有抽样人工检查”，并给出补评估计划：' +
      '先定 schema、抽 200–500 条标注、跑基线、再按失败类型迭代。' +
      '面试里可复现的方法比漂亮数字更可信。',
    tags: ['RAG', '知识图谱', '信息抽取', '项目复盘'],
    points: ['数字口径与可复现', '离线与线上差异', '诚实说明与补评估'],
    sourceRefs: [RAGAS_METRICS, LANGSMITH_EVAL],
  },
  {
    suffix: 'retrieval-pdf-image-parsing',
    title: 'PDF 里的图片或图表解析效果不好，怎么优化？',
    stem:
      '从版面分析、图片分类、OCR 与多模态、表格结构、chunk 组织说明链路；' +
      '扫描件和原生 PDF 方案有什么不同。',
    type: 'system_design',
    difficulty: 'hard',
    answer:
      '先分文档类型：原生 PDF 有文本层，用解析器提取文本、坐标和阅读顺序；扫描件先图像增强再 OCR；' +
      '混合版式要逐页判断。然后做版面分析，把正文、标题、表格、图片、公式分区，' +
      '图片再分类为照片、流程图、图表和公式。图片用多模态模型生成结构化描述（标题、图注、坐标轴、' +
      '数据点、趋势），表格用 table extraction 或视觉模型转 markdown 或 JSON，公式转 LaTeX；' +
      '描述与图注、页码、章节路径一起写入 metadata，和正文同索引。' +
      '检索命中图片块时把图注和上下文一起回填给模型。评估按文档类型抽样，' +
      '看图片问答准确率、表格数值抽取准确率和引用页码正确率；低质量扫描件先做去噪、纠偏和超分，' +
      '高价值文档保留人工复核。',
    tags: ['RAG', '文档解析', '多模态', 'PDF'],
    points: ['文档分类与版面分析', '多模态、表格与公式处理', '元数据组织与评估'],
    sourceRefs: [UNSTRUCTURED, LLAMAPARSE, AZURE_DI],
  },
  {
    suffix: 'retrieval-ocr-quality',
    title: 'OCR 识别准确率不高时，你会怎么优化？',
    stem: '从图像质量、模型选型、后处理、领域词典和人工兜底说明；如何量化 OCR 对最终 RAG 的影响。',
    type: 'project_deep_dive',
    difficulty: 'hard',
    answer:
      '先定位错误类型：模糊、倾斜、低分辨率、印章遮挡、表格线、手写、繁简或中英混排、特殊符号。' +
      '优化分五层：一图像预处理，去噪、二值化、纠偏、超分、去水印和印章；' +
      '二模型选型，通用 OCR 与文档专用或多模态模型按语种和版式选；' +
      '三版面分析先切区域，表格和公式单独处理；四后处理，用领域词典、正则和 LLM 纠错，' +
      '但要有约束防止改错原意，并设置置信度阈值；五低置信度转人工复核。' +
      '评估用字符级 CER/WER 加关键字段准确率，再看下游问答正确率，并按文档类型分层。' +
      'OCR 错字会同时伤害关键词和向量召回，所以必须在入库前拦截，并保留原图与 OCR 结果方便回溯。',
    tags: ['RAG', 'OCR', '文档解析', '数据质量'],
    points: ['错误类型定位', '预处理、模型与后处理', '指标量化与人工兜底'],
    sourceRefs: [PADDLEOCR, TESSERACT, AZURE_DI],
  },
];

export const PUBLIC_RAG_DOCUMENT_QUESTIONS = QUESTIONS.map(buildAgentOpenQuestion);
