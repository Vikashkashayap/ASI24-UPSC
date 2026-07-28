/**
 * Future-ready interfaces — DO NOT implement.
 */

export class AiRerankerPlaceholder {
  async rerank(_query, results) {
    return results;
  }
}

export class KnowledgeGraphPlaceholder {
  async expand(_query) {
    return [];
  }
}

export class QuestionIntelligencePlaceholder {
  async analyze(_query) {
    return { intent: "unknown" };
  }
}

export class AdaptiveLearningPlaceholder {
  async personalize(_userId, results) {
    return results;
  }
}

export const aiReranker = new AiRerankerPlaceholder();
export const knowledgeGraph = new KnowledgeGraphPlaceholder();
export const questionIntelligence = new QuestionIntelligencePlaceholder();
export const adaptiveLearning = new AdaptiveLearningPlaceholder();
