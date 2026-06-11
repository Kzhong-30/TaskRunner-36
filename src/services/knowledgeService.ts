import { Knowledge } from '../models';
import { buildTfIdfIndex, tokenize, jaccardSimilarity } from '../utils/nlp';
import { TfIdf } from 'natural';

export interface KnowledgeMatch {
  knowledge: Knowledge;
  score: number;
  matchedBy: 'tfidf' | 'keyword' | 'hybrid';
}

interface ScoreEntry {
  score: number;
  method: 'tfidf' | 'keyword' | 'hybrid';
}

class KnowledgeService {
  private tfidfCache: {
    tfidf: TfIdf;
    docIds: string[];
    version: number;
  } | null = null;
  private cacheVersion = 0;

  private invalidateCache() {
    this.cacheVersion++;
    this.tfidfCache = null;
  }

  private async getTfIdfIndex() {
    if (this.tfidfCache && this.tfidfCache.version === this.cacheVersion) {
      return this.tfidfCache;
    }
    const allKnowledge = await Knowledge.findAll({ where: { enabled: true } });
    const docs = allKnowledge.map(k => ({
      id: k.id,
      text: k.question + ' ' + k.answer + ' ' + (k.keywords || []).join(' ')
    }));
    const { tfidf, docIds } = buildTfIdfIndex(docs);
    this.tfidfCache = { tfidf, docIds, version: this.cacheVersion };
    return this.tfidfCache;
  }

  async uploadFAQ(items: Array<{ question: string; answer: string; category?: string; keywords?: string[] }>) {
    const created = [];
    for (const item of items) {
      const keywords = item.keywords && item.keywords.length > 0
        ? item.keywords
        : tokenize(item.question).slice(0, 15);
      const k = await Knowledge.create({
        question: item.question,
        answer: item.answer,
        category: item.category,
        keywords
      });
      created.push(k);
    }
    this.invalidateCache();
    return created;
  }

  async search(query: string, topK = 3): Promise<KnowledgeMatch[]> {
    const allKnowledge = await Knowledge.findAll({ where: { enabled: true } });
    if (allKnowledge.length === 0) return [];
    const { tfidf, docIds } = await this.getTfIdfIndex();
    const knowledgeMap = new Map(allKnowledge.map(k => [k.id, k]));
    const queryTokens = tokenize(query);
    const querySet = new Set(queryTokens);
    const scores: Map<string, ScoreEntry> = new Map();

    for (const k of allKnowledge) {
      let keywordHitCount = 0;
      for (const qt of queryTokens) {
        if (k.question.includes(qt) || k.answer.includes(qt)) {
          keywordHitCount += 1;
        }
      }
      if (keywordHitCount > 0) {
        const normalizedKeywordScore = Math.min(1, keywordHitCount / Math.max(1, queryTokens.length));
        scores.set(k.id, { score: normalizedKeywordScore, method: 'keyword' });
      }
    }

    if (queryTokens.length > 0) {
      const docScores = [];
      for (let i = 0; i < docIds.length; i++) {
        let tfidfScore = 0;
        for (const token of queryTokens) {
          try { tfidfScore += tfidf.tfidf(token, i); } catch {}
        }
        docScores.push(tfidfScore);
      }
      const maxTfIdf = Math.max(...docScores) || 1;
      for (let i = 0; i < docIds.length; i++) {
        try {
          const docTokens = new Set(tfidf.listTerms(i).map(t => t.term));
          const jaccard = jaccardSimilarity([...querySet], [...docTokens]);
          const normalizedTfIdf = docScores[i] / maxTfIdf;
          const hybrid = normalizedTfIdf * 0.65 + jaccard * 0.35;
          const existing = scores.get(docIds[i]);
          if (existing) {
            if (hybrid > existing.score) {
              scores.set(docIds[i], { score: hybrid, method: 'hybrid' });
            }
          } else {
            scores.set(docIds[i], { score: hybrid, method: 'tfidf' });
          }
        } catch {
          if (!scores.has(docIds[i])) {
            scores.set(docIds[i], { score: 0, method: 'tfidf' });
          }
        }
      }
    }

    const results: KnowledgeMatch[] = [];
    for (const [id, entry] of scores) {
      const k = knowledgeMap.get(id);
      if (k && entry.score > 0.03) {
        results.push({ knowledge: k, score: entry.score, matchedBy: entry.method });
      }
    }
    results.sort((a, b) => b.score - a.score);
    const topResults = results.slice(0, topK);
    for (const m of topResults) {
      await m.knowledge.increment('views');
    }
    return topResults;
  }

  async findById(id: string) {
    return Knowledge.findByPk(id);
  }

  async list(page = 1, pageSize = 20) {
    return Knowledge.findAndCountAll({
      order: [['createdAt', 'DESC']],
      limit: pageSize,
      offset: (page - 1) * pageSize
    });
  }

  async delete(id: string) {
    const count = await Knowledge.destroy({ where: { id } });
    if (count > 0) this.invalidateCache();
    return count > 0;
  }
}

export const knowledgeService = new KnowledgeService();
