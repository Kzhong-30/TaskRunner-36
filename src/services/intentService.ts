import { Intent, IntentType } from '../models';
import { NaiveBayesIntentClassifier, tokenize } from '../utils/nlp';

export interface IntentDetectionResult {
  intent: IntentType;
  displayName: string;
  confidence: number;
  matchedTokens: string[];
}

class IntentService {
  private classifier: NaiveBayesIntentClassifier | null = null;

  private intentConfig: Record<IntentType, { displayName: string; examples: string[] }> = {
    consultation: {
      displayName: '产品咨询',
      examples: [
        '这个产品怎么使用',
        '请问你们的营业时间是什么',
        '我想了解一下贵公司的服务',
        '产品有什么功能',
        '这款产品多少钱',
        '能介绍一下你们的服务吗',
        '什么是会员制度',
        '如何开通账号',
        '请问支持哪些支付方式',
        '产品规格是多少'
      ]
    },
    complaint: {
      displayName: '用户投诉',
      examples: [
        '我要投诉这个产品',
        '你们的服务太差了',
        '对这次体验非常失望',
        '这就是你们的质量吗',
        '我要投诉你们的客服',
        '东西质量太垃圾了',
        '再也不会买了骗人的',
        '太差劲了完全没用',
        '我要举报你们虚假宣传',
        '什么垃圾东西退钱'
      ]
    },
    after_sales: {
      displayName: '售后服务',
      examples: [
        '我想申请退货',
        '这个产品坏了可以修吗',
        '怎么办理退款',
        '申请换货流程是什么',
        '保修期有多久',
        '商品有质量问题怎么办',
        '七天无理由退货吗',
        '售后电话是多少',
        '坏了找谁维修',
        '可以退换货吗'
      ]
    },
    order_query: {
      displayName: '订单查询',
      examples: [
        '我的订单发货了吗',
        '查一下快递到哪了',
        '怎么还没收到货',
        '物流信息不对',
        '订单号在哪里看',
        '什么时候能到货',
        '下单后多久发货',
        '快递单号是多少',
        '我想查一下我的订单',
        '货到付款可以吗'
      ]
    },
    human_transfer: {
      displayName: '人工转接',
      examples: [
        '我要找人工客服',
        '转人工服务',
        '让真人接电话',
        '不要机器人',
        '叫你们的人来',
        '人工客服在吗',
        '我要和真人说话',
        '接人工',
        '客服有人吗',
        '有没有活人'
      ]
    },
    unknown: {
      displayName: '未知意图',
      examples: []
    }
  };

  async ensureDefaultIntents() {
    const entries = Object.entries(this.intentConfig) as [IntentType, typeof this.intentConfig[IntentType]][];
    for (const [name, cfg] of entries) {
      await Intent.findOrCreate({
        where: { name },
        defaults: {
          name,
          displayName: cfg.displayName,
          description: 'Default intent: ' + name,
          examples: cfg.examples,
          keywords: [],
          priority: name === 'human_transfer' ? 100 : name === 'unknown' ? 0 : 50,
          enabled: true
        }
      });
    }
    await this.trainClassifier();
  }

  private async trainClassifier() {
    const intents = await Intent.findAll({ where: { enabled: true } });
    this.classifier = new NaiveBayesIntentClassifier();

    for (const intent of intents) {
      if (intent.name === 'unknown') continue;
      const examples = intent.examples || [];
      for (const example of examples) {
        this.classifier.addDocument(example, intent.name);
      }
    }

    this.classifier.train();
  }

  private getDisplayName(intent: IntentType): string {
    return this.intentConfig[intent]?.displayName || intent;
  }

  async detect(userMessage: string): Promise<IntentDetectionResult> {
    if (!this.classifier || !this.classifier.isTrained()) {
      await this.trainClassifier();
    }

    const tokens = tokenize(userMessage);
    const result = this.classifier!.classify(userMessage);
    const intentName = (result.label as IntentType) || 'unknown';

    let matchedTokens: string[] = [];
    try {
      const dbIntent = await Intent.findOne({ where: { name: intentName, enabled: true } });
      if (dbIntent?.keywords) {
        matchedTokens = dbIntent.keywords.filter(kw =>
          tokens.some(t => t.includes(kw) || kw.includes(t))
        ).slice(0, 10);
      }
    } catch {}

    if (result.confidence < 0.35) {
      return {
        intent: 'unknown',
        displayName: this.getDisplayName('unknown'),
        confidence: result.confidence,
        matchedTokens: []
      };
    }

    return {
      intent: intentName,
      displayName: this.getDisplayName(intentName),
      confidence: result.confidence,
      matchedTokens
    };
  }

  async listIntents(): Promise<Intent[]> {
    return Intent.findAll({ order: [['priority', 'DESC']] });
  }

  async retrain() {
    await this.trainClassifier();
  }
}

export const intentService = new IntentService();
