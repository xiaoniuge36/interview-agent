import type { PublicPracticeQuestionInput } from './public-practice-question-builders';

/**
 * 工程方向实战题：经典系统设计与手撕代码高频题，参考大厂面试真题模式。
 */
export const ENGINEERING_HANDS_ON_INPUTS: PublicPracticeQuestionInput[] = [
  {
    suffix: 'engineering-design-shorturl',
    title: '设计一个短链接服务',
    stem: '请设计一个日均亿级访问的短链服务：短码生成策略、存储选型、跳转链路、过期与统计能力。',
    answer:
      '短码用发号器加进制转换避免冲突，存储用缓存加持久化两级，302 跳转保留统计能力，热点短链走 CDN 或本地缓存，过期用惰性删除加定时清理。',
    tags: ['系统设计', '短链服务', 'company:字节跳动'],
    points: ['短码生成', '存储与缓存', '跳转与统计'],
    type: 'system_design',
    difficulty: 'hard',
  },
  {
    suffix: 'engineering-design-seckill',
    title: '设计一个秒杀系统',
    stem: '请设计支撑十万 QPS 的秒杀系统：流量削峰、库存扣减、防超卖与防刷、失败恢复。',
    answer:
      '入口用答题或验证码削峰、网关限流，库存预热到 Redis 用 Lua 原子扣减，消息队列异步落单，唯一索引与幂等键防超卖，风控识别机器流量。',
    tags: ['系统设计', '秒杀', '高并发', 'company:阿里巴巴'],
    points: ['削峰限流', '原子扣减', '防超卖'],
    type: 'system_design',
    difficulty: 'hard',
  },
  {
    suffix: 'engineering-design-notification',
    title: '设计一个站内消息通知系统',
    stem: '请设计支持系统通知、互动消息、未读数的通知系统：推拉模型选择、未读数一致性、多端同步。',
    answer:
      '大 V 场景用拉模型、普通用户用推模型的混合方案，未读数用计数服务单独维护并容忍最终一致，多端用已读位点同步，消息盒子按类型分栏存储。',
    tags: ['系统设计', '消息系统'],
    points: ['推拉选择', '未读数设计', '多端同步'],
    type: 'system_design',
  },
  {
    suffix: 'engineering-coding-lru',
    title: '手写一个 LRU 缓存',
    stem: '请实现 get 与 put 均为 O(1) 的 LRU 缓存，说明数据结构选择理由，并给出代码与边界处理。',
    answer:
      '哈希表加双向链表：哈希表 O(1) 定位节点，双向链表维护访问顺序，命中或写入时移动节点到头部，超容量时淘汰尾部；注意更新已有 key 与容量为 1 的边界。',
    tags: ['手撕代码', '数据结构', 'LRU'],
    points: ['结构选择', '操作复杂度', '边界处理'],
    type: 'coding',
  },
  {
    suffix: 'engineering-coding-debounce',
    title: '手写防抖与节流函数',
    stem: '请实现 debounce 与 throttle，说明两者语义区别、适用场景，并处理 this 与参数透传。',
    answer:
      '防抖是停止触发后延迟执行一次（搜索联想），节流是固定周期内至多执行一次（滚动监听）；实现用闭包保存定时器或时间戳，注意 apply 透传 this 与参数、支持取消。',
    tags: ['手撕代码', '前端', 'JavaScript'],
    points: ['语义区分', '实现正确性', '细节处理'],
    type: 'coding',
    difficulty: 'easy',
  },
];

/**
 * 数据方向实战题：SQL 手写高频题。
 */
export const DATA_HANDS_ON_INPUTS: PublicPracticeQuestionInput[] = [
  {
    suffix: 'data-coding-consecutive',
    title: 'SQL 手写：找出连续三天活跃的用户',
    stem: '给定 user_login(user_id, login_date) 表，写出查询连续登录不少于三天的用户及起止日期，并说明思路。',
    answer:
      '先按用户去重日期并用 row_number 编号，用 login_date 减去编号天数得到分组键，相同键即连续段，按键分组计数不小于三再取最早最晚日期。',
    tags: ['SQL', '窗口函数', '手撕代码', 'company:美团'],
    points: ['连续分组技巧', 'SQL 正确性', '边界说明'],
    type: 'coding',
    difficulty: 'medium',
  },
];
