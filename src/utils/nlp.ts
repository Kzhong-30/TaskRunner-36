import { TfIdf, BayesClassifier, PorterStemmer } from 'natural';

const STOP_WORDS = new Set([
  '的', '了', '是', '在', '我', '你', '他', '她', '它', '们', '有', '和', '就', '都', '而', '及',
  '与', '着', '或', '一个', '没有', '我们', '你们', '他们', '这个', '那个', '什么', '怎么',
  '如果', '因为', '所以', '但是', '然后', '已经', '可以', '可能', '应该', '需要',
  '吗', '呢', '啊', '吧', '呀', '哦', '嗯',
  '如何', '根据', '描述', '建议', '你们', '他们', '一下', '请问', '什么',
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
  'this', 'that', 'what', 'how', 'why', 'when', 'where', 'which', 'and', 'or',
  'but', 'of', 'to', 'in', 'on', 'for', 'with', 'at', 'by', 'from', 'as',
  'please', 'help', 'want', 'would', 'could', 'should'
]);

const MEANINGLESS_BIGRAMS = new Set([
  '们的', '问你', '品怎', '么退', '货我', '议您', '您可', '的产',
  '的的', '了了', '是是', '在在', '我我', '你你',
  '请问', '了我', '一下', '一个', '没有', '我们', '你们',
  '的话', '一种', '一样', '一起', '一般', '一定', '就是', '真是', '还是', '或者',
  '以及', '等等', '之类', '什么', '怎么', '为什么', '哪里', '哪个', '哪些', '怎样',
  '如何', '可以', '能够', '是否', '他们', '它们', '这个', '那个', '每个', '各个',
  '某个', '其他', '其它', '自己', '别人', '大家', '咱们', '你好', '您好', '谢谢',
  '感谢', '抱歉', '对不起', '不好意思', '打扰了', '请问一下', '能不能', '可不可以',
  '行不行', '好不好', '对不对', '是不是', '有没有', '在不在', '了吗', '吗呢',
  '呢啊', '啊吧', '吧呀', '呀哦', '哦嗯', '的了', '了的', '是在', '在是', '我你',
  '你我', '的是', '是的'
]);

export function tokenize(text: string): string[] {
  const lower = text.toLowerCase();
  const cleaned = lower.replace(/[^\w\u4e00-\u9fa5\s]/g, ' ');
  const tokens: string[] = [];

  const englishWords = cleaned.match(/[a-zA-Z]{2,}/g) || [];
  for (const word of englishWords) {
    const stemmed = PorterStemmer.stem(word);
    if (!STOP_WORDS.has(stemmed) && !STOP_WORDS.has(word) && word.length >= 2) {
      tokens.push(stemmed);
    }
  }

  const chineseChars = Array.from(cleaned).filter(c => /[\u4e00-\u9fa5]/.test(c));
  for (let i = 0; i < chineseChars.length - 1; i++) {
    const bigram = chineseChars[i] + chineseChars[i + 1];
    if (!MEANINGLESS_BIGRAMS.has(bigram) && !STOP_WORDS.has(bigram)) {
      tokens.push(bigram);
    }
  }

  return tokens;
}

export function buildTfIdfIndex(documents: Array<{ id: string; text: string }>): {
  tfidf: TfIdf;
  docIds: string[];
} {
  const tfidf = new TfIdf();
  const docIds: string[] = [];
  for (const doc of documents) {
    const tokens = tokenize(doc.text);
    tfidf.addDocument(tokens, doc.id);
    docIds.push(doc.id);
  }
  return { tfidf, docIds };
}

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export function jaccardSimilarity(setA: string[], setB: string[]): number {
  const set1 = new Set(setA);
  const set2 = new Set(setB);
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

export class NaiveBayesIntentClassifier {
  private classifier: BayesClassifier;
  private trained: boolean = false;

  constructor() {
    this.classifier = new BayesClassifier();
  }

  addDocument(text: string, label: string) {
    const tokens = tokenize(text);
    this.classifier.addDocument(tokens, label);
  }

  train() {
    this.classifier.train();
    this.trained = true;
  }

  classify(text: string): { label: string; confidence: number } {
    if (!this.trained) return { label: 'unknown', confidence: 0 };
    const tokens = tokenize(text);
    try {
      const classifications = this.classifier.getClassifications(tokens);
      if (classifications.length === 0) return { label: 'unknown', confidence: 0 };
      const maxVal = Math.max(...classifications.map(c => c.value));
      const expSum = classifications.reduce((sum, c) => sum + Math.exp(c.value - maxVal), 0);
      const top = classifications[0];
      const confidence = Math.exp(top.value - maxVal) / expSum;
      return { label: top.label, confidence: Math.min(1, Math.max(0, confidence)) };
    } catch (e) {
      return { label: 'unknown', confidence: 0 };
    }
  }

  isTrained(): boolean { return this.trained; }
}

export function extractTopKeywords(texts: string[], topN = 10): Array<{ word: string; count: number; score: number }> {
  const allTokens: string[] = [];
  for (const text of texts) {
    allTokens.push(...tokenize(text));
  }

  const freq = new Map<string, number>();
  for (const token of allTokens) {
    if (token.length >= 2 && !STOP_WORDS.has(token) && !MEANINGLESS_BIGRAMS.has(token)) {
      freq.set(token, (freq.get(token) || 0) + 1);
    }
  }

  const tfidf = new TfIdf();
  for (const text of texts) {
    tfidf.addDocument(tokenize(text));
  }

  const scored = Array.from(freq.entries())
    .map(([word, count]) => {
      let tfidfScore = 0;
      try {
        const terms = tfidf.listTerms(0);
        const found = terms.find((t: any) => t.term === word);
        tfidfScore = found ? found.tfidf : 0;
      } catch {}
      const score = count * 0.4 + tfidfScore * 0.4;
      return { word, count, score };
    })
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, topN);
}
