export interface LLMProvider {
  name: string;
  model: string;
  classify(transaction: TransactionToClassify): Promise<ClassificationResult>;
  classifyBatch(transactions: TransactionToClassify[]): Promise<ClassificationResult[]>;
}

export interface TransactionToClassify {
  id: string;
  description: string;
  merchant_name?: string;
  amount: number;
  currency: string;
  transaction_type: 'debit' | 'credit';
}

export interface ClassificationResult {
  transaction_id: string;
  category_id: string;
  confidence_score: number;
  reasoning?: string;
  metadata?: Record<string, any>;
}

export interface CategoryInfo {
  id: string;
  name: string;
  parent_name?: string;
  category_type: 'income' | 'expense' | 'transfer';
}
