export type Category = 'billing' | 'technical' | 'account' | 'feature_request' | 'general';
export type Priority = 'critical' | 'high' | 'medium' | 'low';

export interface ClassifyResult {
  category: Category;
  priority: Priority;
  confidence: number; // 0-1
  summary: string;
  suggestedReply: string;
  provider: string;
}

export interface AiProvider {
  name: string;
  classify(title: string, body: string): Promise<ClassifyResult>;
}
