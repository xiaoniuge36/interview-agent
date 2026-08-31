import type { PublicChoiceQuestionInput } from './public-practice-question-builders';

/**
 * 工程方向概念选择题：参考主流笔试题库的高频基础概念，用于快速自测。
 */
export const ENGINEERING_CHOICE_INPUTS: PublicChoiceQuestionInput[] = [
  {
    suffix: 'engineering-choice-redirect',
    title: 'HTTP 301 与 302 的核心区别是什么？',
    stem: '关于 301 与 302 重定向，以下说法正确的是？',
    options: [
      '301 是临时重定向，浏览器不会缓存',
      '301 是永久重定向，搜索引擎会转移权重并且浏览器可长期缓存',
      '302 表示资源已被永久删除',
      '两者行为完全一致，仅语义不同',
    ],
    correctOptionIds: ['B'],
    answer: 'B。301 永久重定向会被缓存且搜索引擎转移权重；302 临时重定向每次仍会请求原地址。',
    tags: ['网络基础', 'HTTP'],
  },
  {
    suffix: 'engineering-choice-process-thread',
    title: '进程与线程的关系，哪项描述正确？',
    stem: '以下关于进程与线程的说法，正确的是？',
    options: [
      '线程是资源分配的最小单位',
      '同一进程内的线程共享地址空间，切换开销小于进程切换',
      '进程之间默认共享内存',
      '一个线程崩溃不会影响同进程的其他线程',
    ],
    correctOptionIds: ['B'],
    answer: 'B。进程是资源分配单位、线程是调度单位；同进程线程共享地址空间，切换更轻量。',
    tags: ['操作系统', '并发'],
  },
  {
    suffix: 'engineering-choice-index-miss',
    title: '以下哪种写法最可能导致 MySQL 索引失效？',
    stem: '假设 name 列上有普通索引，哪个查询最可能放弃走索引？',
    options: [
      "WHERE name = 'alice'",
      "WHERE name LIKE 'ali%'",
      "WHERE LOWER(name) = 'alice'",
      "WHERE name IN ('alice', 'bob')",
    ],
    correctOptionIds: ['C'],
    answer: 'C。对索引列使用函数会破坏索引有序性导致失效；前缀 LIKE 和 IN 通常仍可走索引。',
    tags: ['数据库', '索引优化'],
    difficulty: 'medium',
  },
  {
    suffix: 'engineering-choice-tcp-handshake',
    title: 'TCP 三次握手的核心目的是什么？',
    stem: '为什么建立连接需要三次握手而不是两次？',
    options: [
      '为了传输更多控制数据',
      '确认双方收发能力并同步初始序列号，避免历史重复连接',
      '为了协商加密算法',
      '纯粹是协议历史遗留设计',
    ],
    correctOptionIds: ['B'],
    answer: 'B。三次握手确认双向收发能力并同步序列号，还能防止旧的重复连接请求建立无效连接。',
    tags: ['网络基础', 'TCP'],
  },
  {
    suffix: 'engineering-choice-lock',
    title: '乐观锁与悲观锁的适用场景，哪项正确？',
    stem: '关于两种并发控制策略的选择，以下说法正确的是？',
    options: [
      '写冲突激烈的场景优先用乐观锁',
      '乐观锁通过版本号或 CAS 检测冲突，适合读多写少场景',
      '悲观锁不会引起阻塞',
      '乐观锁失败时数据会直接损坏',
    ],
    correctOptionIds: ['B'],
    answer: 'B。乐观锁假设冲突少，提交时校验版本号，适合读多写少；冲突激烈时重试成本高应选悲观锁。',
    tags: ['并发控制', '数据库'],
    difficulty: 'medium',
  },
];

/**
 * 数据方向概念选择题：SQL 细节、统计思维与实验设计高频考点。
 */
export const DATA_CHOICE_INPUTS: PublicChoiceQuestionInput[] = [
  {
    suffix: 'data-choice-left-join',
    title: 'LEFT JOIN 后在 WHERE 中过滤右表字段会发生什么？',
    stem: 'SELECT * FROM a LEFT JOIN b ON a.id=b.aid WHERE b.status=1 的实际效果是？',
    options: [
      '保留 a 表全部行，b 无匹配时补 NULL',
      '等价于 INNER JOIN，未匹配行被 WHERE 过滤掉',
      '语法错误',
      'b.status 为 NULL 的行也会保留',
    ],
    correctOptionIds: ['B'],
    answer:
      'B。右表字段在 WHERE 中过滤会剔除 NULL 行，使 LEFT JOIN 退化为 INNER JOIN；应把条件写进 ON。',
    tags: ['SQL', '数据处理'],
    difficulty: 'medium',
  },
  {
    suffix: 'data-choice-p-value',
    title: '对 p 值的正确解读是哪项？',
    stem: 'AB 实验得到 p=0.03，以下解读正确的是？',
    options: [
      '原假设为真的概率是 3%',
      '实验组比对照组好的概率是 97%',
      '在原假设为真的前提下，观察到当前或更极端差异的概率是 3%',
      '效果量（提升幅度）达到 3%',
    ],
    correctOptionIds: ['C'],
    answer:
      'C。p 值是条件概率：假设原假设成立时出现当前或更极端数据的概率，不是假设本身为真的概率。',
    tags: ['统计思维', 'A/B 测试'],
    difficulty: 'medium',
  },
  {
    suffix: 'data-choice-uv-pv',
    title: 'UV 与 PV 的关系，哪项正确？',
    stem: '关于页面访问指标，以下说法正确的是？',
    options: [
      'PV 按设备去重，UV 按次数累计',
      'UV 按访客去重，PV 每次浏览都累计，同一用户刷新十次 PV 加十',
      'UV 恒大于等于 PV',
      '两者口径完全相同',
    ],
    correctOptionIds: ['B'],
    answer: 'B。UV 是去重后的访客数，PV 是页面浏览量；同一访客多次浏览会推高 PV 而 UV 不变。',
    tags: ['指标体系', '流量分析'],
  },
  {
    suffix: 'data-choice-median',
    title: '什么场景下中位数比平均数更能代表整体水平？',
    stem: '分析用户收入、订单金额这类数据时，以下说法正确的是？',
    options: [
      '任何时候平均数都更准确',
      '数据右偏、存在极端大值时，中位数更能代表典型水平',
      '中位数会被极端值显著拉高',
      '两者数值总是接近',
    ],
    correctOptionIds: ['B'],
    answer: 'B。收入类数据常右偏，少数高值把平均数拉高；中位数对极端值稳健，更能反映典型用户。',
    tags: ['统计思维', '数据分析'],
  },
  {
    suffix: 'data-choice-sample-size',
    title: '哪些因素会影响 AB 实验所需的样本量？',
    stem: '设计实验时估算最小样本量，以下哪一项不是主要输入？',
    options: ['显著性水平与统计功效', '预期最小可检测提升幅度', '基线转化率', '实验分组的命名方式'],
    correctOptionIds: ['D'],
    answer: 'D。样本量由显著性水平、功效、基线值与最小可检测效应共同决定，与分组命名无关。',
    tags: ['实验设计', 'A/B 测试'],
    difficulty: 'medium',
  },
];

/**
 * 产品与设计方向概念选择题：产品方法论与设计原则高频考点。
 */
export const PRODUCT_DESIGN_CHOICE_INPUTS: PublicChoiceQuestionInput[] = [
  {
    suffix: 'product-choice-kano',
    title: 'KANO 模型中的「兴奋型需求」指什么？',
    stem: '关于 KANO 模型需求分类，以下说法正确的是？',
    options: [
      '没有会强烈不满、有了也不会更满意的需求',
      '满意度随满足程度线性提升的需求',
      '用户没预期、缺失不扣分、做到会带来惊喜的需求',
      '用户明确说不要的需求',
    ],
    correctOptionIds: ['C'],
    answer: 'C。兴奋型需求超出用户预期，缺失不会不满，做到能显著提升满意度与口碑。',
    tags: ['需求分析', 'KANO 模型'],
  },
  {
    suffix: 'product-choice-rice',
    title: 'RICE 优先级评分的四个因子是什么？',
    stem: '用 RICE 为需求排序时，四个字母分别代表？',
    options: [
      '收入、成本、影响、努力',
      '触达人数、影响程度、信心、投入成本',
      '风险、迭代、竞品、体验',
      '留存、增长、转化、口碑',
    ],
    correctOptionIds: ['B'],
    answer: 'B。RICE = Reach 触达 × Impact 影响 × Confidence 信心 ÷ Effort 投入，用于量化优先级。',
    tags: ['优先级', '产品方法论'],
  },
  {
    suffix: 'product-choice-nielsen',
    title: '「系统状态可见性」违反案例是哪项？',
    stem: '依据尼尔森十大可用性原则，以下哪个设计违反了系统状态可见性？',
    options: [
      '上传文件时展示进度条',
      '提交订单后长时间无任何反馈，用户不知道是否成功',
      '删除前弹出确认对话框',
      '表单错误时高亮标出错误字段',
    ],
    correctOptionIds: ['B'],
    answer: 'B。系统状态可见性要求及时反馈系统正在发生什么；提交后无反馈让用户失去掌控感。',
    tags: ['可用性原则', '交互设计'],
    difficulty: 'medium',
  },
  {
    suffix: 'product-choice-mvp',
    title: '对 MVP（最小可行产品）的正确理解是哪项？',
    stem: '以下关于 MVP 的说法，正确的是？',
    options: [
      'MVP 就是功能残缺的半成品',
      'MVP 是能完整验证核心假设的最小闭环，重点是可学习而非功能多',
      'MVP 必须免费提供',
      'MVP 阶段不需要关注体验',
    ],
    correctOptionIds: ['B'],
    answer: 'B。MVP 的目标是用最小成本验证「用户是否需要」的核心假设，闭环完整比功能堆叠重要。',
    tags: ['MVP', '产品方法论'],
  },
  {
    suffix: 'product-choice-interview',
    title: '用户访谈中哪种提问方式最不容易引入偏差？',
    stem: '想了解用户对新功能的真实态度，哪个问题设计最合理？',
    options: [
      '「这个功能很方便对吧？」',
      '「你会每天都用这个功能吗？」',
      '「请讲讲你上一次遇到这个问题时是怎么处理的？」',
      '「如果我们做了这个功能你会付费吗？」',
    ],
    correctOptionIds: ['C'],
    answer: 'C。回溯真实行为比询问假设意愿可靠：引导性提问和未来意愿类问题都容易得到讨好性回答。',
    tags: ['用户研究', '访谈技巧'],
    difficulty: 'medium',
  },
];
