import { Intent, IntentType } from '../models';
import { NaiveBayesIntentClassifier, tokenize } from '../utils/nlp';

export interface IntentDetectionResult {
  intent: IntentType;
  displayName: string;
  confidence: number;
  matchedTokens: string[];
}

class IntentService {
  private keywordMap: Record<string, string[]> = {
      consultation: ['产品', '服务', '介绍', '价格', '功能', '使用', '规格', '特色', '材质', '优惠', '咨询', '了解', '请问', '什么', '如何', '多少钱', '有什么'],
      complaint: ['投诉', '差', '垃圾', '失望', '骗', '烂', '不满', '态度', '举报', '虚假', '差评', '生气', '愤怒', '糟糕', '太差', '骗人', '垃圾玩意'],
      after_sales: ['退货', '退款', '换货', '维修', '保修', '售后', '退换', '破损', '修理', '退换货', '七天无理由', '质量问题', '退款申请', '售后维修', '保修卡', '退换申请'],
      order_query: ['订单', '快递', '发货', '物流', '收货', '查询', '单号', '到货', '配送', '快递单号', '订单号', '发货了吗', '物流信息', '什么时候到', '查快递', '我的订单'],
      human_transfer: ['人工', '真人', '客服', '转人工', '活人', '管理员', '人工客服', '在线客服', '找客服', '客服人员', '不要机器人', '人工服务', '接人工', '人工台', '客服专员', '找人工'],
      unknown: []
    };
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
        '产品规格是多少',
        '你们有什么特色服务',
        '这款产品材质是什么',
        '有没有优惠活动',
        '怎么联系你们',
        '送货上门吗',
        '支持货到付款吗',
        '产品保修多久',
        '有使用说明吗',
        '能给点建议吗',
        '最新款是什么',
        '库存还有多少',
        '可以批量采购吗',
        '和旧款有什么区别',
        '适合什么人群使用',
        '有配套服务吗',
        '会员有什么权益',
        '新用户有折扣吗',
        '你们的服务范围有哪些',
        '有没有免费试用',
        '可以定制吗',
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
        '什么垃圾东西退钱',
        '客服态度太恶劣了',
        '我要投诉到底',
        '完全不负责任',
        '敷衍了事太过分了',
        '说话不算数骗子',
        '产品和宣传完全不符',
        '收到的东西是坏的',
        '答应的都没做到',
        '这就是你们的态度吗',
        '再也不会相信你们了',
        '必须给我一个说法',
        '太不专业了你们',
        '浪费我的时间',
        '处理问题太慢了',
        '售后推来推去',
        '根本解决不了问题',
        '你们的承诺都是假的',
        '太坑人了',
        '简直无法忍受',
        '我要去消协投诉',
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
        '可以退换货吗',
        '收到货有破损怎么办',
        '配件丢失了怎么处理',
        '不满意可以退吗',
        '保修需要发票吗',
        '维修费用怎么算',
        '换货要自己出运费吗',
        '退款多久能到账',
        '过了保修期还能修吗',
        '怎么申请售后',
        '退货运费谁承担',
        '质量问题包退换吗',
        '换货发什么快递',
        '可以延长保修吗',
        '收到货不对版',
        '包装损坏了',
        '可以补发配件吗',
        '退货流程太复杂了',
        '换货需要多长时间',
        '维修要寄回去吗',
        '退款方式有哪些',
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
        '货到付款可以吗',
        '订单能改地址吗',
        '能取消订单吗',
        '修改收货人信息',
        '订单状态显示已签收但没收到',
        '可以改快递吗',
        '订单备注在哪里',
        '怎么申请开发票',
        '订单超时怎么办',
        '分开发货吗',
        '有运费险吗',
        '能改颜色吗',
        '能合并订单吗',
        '订单金额不对',
        '优惠券怎么没用',
        '发货太慢了',
        '可以加急发货吗',
        '快递送到哪里了',
        '订单被取消了怎么办',
        '能修改收货时间吗',
        '配送范围有哪些',
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
        '有没有活人',
        '我要投诉转人工',
        '在线客服有人吗',
        '找个活人来解决',
        '机器客服没用',
        '帮我接人工',
        '我想跟客服说话',
        '转客服专员',
        '人工服务请按0',
        '我不要自动回复',
        '请人工联系我',
        '有人工吗我要咨询',
        '老板在吗',
        '管理员出来',
        '给我接个真人',
        '客服快出来',
        '赶紧转人工',
        '机器人解决不了',
        '我要和负责人谈',
        '让你们经理来',
        '不要机器要真人',
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

    const KEYWORD_MAP = this.keywordMap;

    for (const intent of intents) {
      if (intent.name === 'unknown') continue;
      const examples = intent.examples || [];
      const keywords = KEYWORD_MAP[intent.name] || [];
      for (const example of examples) {
        this.classifier.addDocument(example + ' ' + keywords.join(' ') + ' ' + keywords.join(' ') + ' ' + keywords.join(' '), intent.name);
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

    const KEYWORD_MAP = this.keywordMap;
    const keywords = KEYWORD_MAP[intentName] || [];
    const matchedTokens = keywords.filter(kw =>
      tokens.some(t => t.includes(kw) || kw.includes(t))
    ).slice(0, 10);


    const scaledConfidence = Math.pow(result.confidence, 0.6);

    if (scaledConfidence < 0.25) {
      return {
        intent: 'unknown',
        displayName: this.getDisplayName('unknown'),
        confidence: scaledConfidence,
        matchedTokens: []
      };
    }

    return {
      intent: intentName,
      displayName: this.getDisplayName(intentName),
      confidence: scaledConfidence,
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
