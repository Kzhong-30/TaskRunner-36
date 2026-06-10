import { Intent, IntentType } from '../models';

export interface IntentDetectionResult {
  intent: IntentType;
  displayName: string;
  confidence: number;
  matchedKeywords: string[];
}

class IntentService {
  private intentConfig: Record<IntentType, { keywords: string[]; examples: string[] }> = {
    consultation: {
      keywords: ['咨询', '了解', '查询', '请问', '什么是', '怎么', '如何', '说明', '介绍', '想知道', '问一下', '咨询一下'],
      examples: ['这个产品怎么使用？', '请问你们的营业时间是什么？', '我想了解一下贵公司的服务']
    },
    complaint: {
      keywords: ['投诉', '差评', '不满', '愤怒', '失望', '投诉你们', '垃圾', '差劲', '太差了', '糟糕', '骗子', '举报'],
      examples: ['我要投诉这个产品！', '你们的服务太差了', '对这次体验非常失望']
    },
    after_sales: {
      keywords: ['退货', '退款', '售后', '维修', '保修', '换货', '更换', '坏了', '质量问题', '退钱', '7天无理由', '三包'],
      examples: ['我想申请退货', '这个产品坏了可以修吗？', '怎么办理退款？']
    },
    order_query: {
      keywords: ['订单', '物流', '发货', '快递', '下单', '购买', '付款', '支付', '到哪了', '查订单', '单号', '运单'],
      examples: ['我的订单发货了吗？', '查一下快递到哪了', '怎么还没收到货？']
    },
    human_transfer: {
      keywords: ['人工', '转人工', '客服', '真人', '工作人员', '找你们经理', '接人工', '叫人来', '不要机器人', '人呢'],
      examples: ['我要找人工客服', '转人工服务', '让真人接电话']
    },
    unknown: {
      keywords: [],
      examples: []
    }
  };

  async ensureDefaultIntents() {
    for (const [name, cfg] of Object.entries(this.intentConfig)) {
      const intentName = name as IntentType;
      const [intent] = await Intent.findOrCreate({
        where: { name: intentName },
        defaults: {
          name: intentName,
          displayName: this.getDisplayName(intentName),
          description: `Default intent: ${intentName}`,
          keywords: cfg.keywords,
          examples: cfg.examples,
          priority: intentName === 'human_transfer' ? 100 : intentName === 'unknown' ? 0 : 50,
          enabled: true
        }
      });
      if (intent.keywords?.length === 0 && cfg.keywords.length > 0) {
        await intent.update({ keywords: cfg.keywords, examples: cfg.examples });
      }
    }
  }

  private getDisplayName(intent: IntentType): string {
    const map: Record<IntentType, string> = {
      consultation: '产品咨询',
      complaint: '用户投诉',
      after_sales: '售后服务',
      order_query: '订单查询',
      human_transfer: '人工转接',
      unknown: '未知意图'
    };
    return map[intent];
  }

  async detect(userMessage: string): Promise<IntentDetectionResult> {
    const intents = await Intent.findAll({ where: { enabled: true } });
    const lowerMsg = userMessage.toLowerCase();

    let best: IntentDetectionResult = {
      intent: 'unknown',
      displayName: '未知意图',
      confidence: 0,
      matchedKeywords: []
    };

    for (const intent of intents) {
      if (intent.name === 'unknown') continue;

      const keywords = intent.keywords || [];
      const matched: string[] = [];
      for (const kw of keywords) {
        if (lowerMsg.includes(kw.toLowerCase())) {
          matched.push(kw);
        }
      }

      const coverage = keywords.length > 0 ? matched.length / keywords.length : 0;
      const density = userMessage.length > 0 ? matched.length / (userMessage.length / 3) : 0;
      const priorityBoost = (intent.priority || 50) / 100 * 0.2;
      const confidence = Math.min(0.95, coverage * 0.5 + density * 0.3 + priorityBoost + (matched.length > 0 ? 0.1 : 0));

      if (confidence > best.confidence) {
        best = {
          intent: intent.name,
          displayName: intent.displayName,
          confidence,
          matchedKeywords: matched
        };
      }
    }

    return best;
  }

  async listIntents(): Promise<Intent[]> {
    return Intent.findAll({ order: [['priority', 'DESC']] });
  }
}

export const intentService = new IntentService();
