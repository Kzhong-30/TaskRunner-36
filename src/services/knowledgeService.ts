import { Knowledge } from '../models';
import { Op } from 'sequelize';

export interface KnowledgeMatch {
  knowledge: Knowledge;
  score: number;
  matchedBy: 'keyword' | 'similarity' | 'hybrid';
}

class KnowledgeService {
  async uploadFAQ(
    items: Array<{ question: string; answer: string; category?: string; keywords?: string[] }>
  ): Promise<Knowledge[]> {
    const created: Knowledge[] = [];
    for (const item of items) {
      const k = await Knowledge.create({
        question: item.question,
        answer: item.answer,
        category: item.category,
        keywords: item.keywords || this.extractKeywords(item.question),
        vector: this.simpleVectorize(item.question + ' ' + item.answer)
      });
      created.push(k);
    }
    return created;
  }

  async search(query: string, topK = 3): Promise<KnowledgeMatch[]> {
    const allKnowledge = await Knowledge.findAll({ where: { enabled: true } });
    if (allKnowledge.length === 0) return [];

    const queryKeywords = this.extractKeywords(query);
    const queryVector = this.simpleVectorize(query);

    const matches: KnowledgeMatch[] = allKnowledge.map(k => {
      const keywordScore = this.keywordMatchScore(queryKeywords, k.keywords || []);
      const similarityScore = this.cosineSimilarity(queryVector, k.vector || []);
      const textMatchScore = this.textOverlapScore(query, k.question);

      const hybridScore = keywordScore * 0.4 + similarityScore * 0.4 + textMatchScore * 0.2;

      let matchedBy: 'keyword' | 'similarity' | 'hybrid' = 'hybrid';
      if (keywordScore > similarityScore && keywordScore > textMatchScore) matchedBy = 'keyword';
      else if (similarityScore > textMatchScore) matchedBy = 'similarity';

      return {
        knowledge: k,
        score: hybridScore,
        matchedBy
      };
    });

    matches.sort((a, b) => b.score - a.score);
    const filtered = matches.filter(m => m.score > 0.25).slice(0, topK);

    for (const m of filtered) {
      await m.knowledge.increment('views');
    }

    return filtered;
  }

  async findById(id: string): Promise<Knowledge | null> {
    return Knowledge.findByPk(id);
  }

  async list(page = 1, pageSize = 20): Promise<{ rows: Knowledge[]; count: number }> {
    return Knowledge.findAndCountAll({
      order: [['createdAt', 'DESC']],
      limit: pageSize,
      offset: (page - 1) * pageSize
    });
  }

  async delete(id: string): Promise<boolean> {
    const count = await Knowledge.destroy({ where: { id } });
    return count > 0;
  }

  private extractKeywords(text: string): string[] {
    const cleaned = text.toLowerCase().replace(/[^\w\u4e00-\u9fa5\s]/g, ' ');
    const words = cleaned.split(/\s+/).filter(w => w.length >= 2);
    const stopWords = new Set(['的', '了', '吗', '啊', '呢', '是', '在', '我', '你', '有', '和', '就', '都', '而', '及', 'the', 'a', 'an', 'is', 'are', 'what', 'how', 'why', 'do', 'does', 'did']);
    return [...new Set(words.filter(w => !stopWords.has(w)))];
  }

  private keywordMatchScore(queryKw: string[], docKw: string[]): number {
    if (queryKw.length === 0 || docKw.length === 0) return 0;
    let matches = 0;
    for (const q of queryKw) {
      for (const d of docKw) {
        if (q === d || d.includes(q) || q.includes(d)) matches++;
      }
    }
    return matches / Math.max(queryKw.length, docKw.length);
  }

  private simpleVectorize(text: string): number[] {
    const dims = 64;
    const vec = new Array(dims).fill(0);
    const chars = text.toLowerCase();
    for (let i = 0; i < chars.length; i++) {
      const code = chars.charCodeAt(i);
      vec[code % dims] += 1;
      vec[(code * 7 + i) % dims] += 0.5;
    }
    const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
    return vec.map(v => v / norm);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
  }

  private textOverlapScore(a: string, b: string): number {
    const aChars = new Set(a.toLowerCase().split(''));
    const bChars = new Set(b.toLowerCase().split(''));
    let intersection = 0;
    for (const c of aChars) {
      if (bChars.has(c)) intersection++;
    }
    const union = aChars.size + bChars.size - intersection;
    return union === 0 ? 0 : intersection / union;
  }
}

export const knowledgeService = new KnowledgeService();
