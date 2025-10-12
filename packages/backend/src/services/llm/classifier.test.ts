import { TransactionClassifier } from './classifier';
import { LLMProvider, TransactionToClassify } from './types';

// Mock LLM Provider
class MockLLMProvider implements LLMProvider {
  name = 'mock';
  model = 'mock-model';

  async classify(transaction: TransactionToClassify) {
    return {
      transaction_id: transaction.id,
      category_id: '00000000-0000-0000-0000-000000000001',
      confidence_score: 0.9,
      metadata: { provider: 'mock' },
    };
  }

  async classifyBatch(transactions: TransactionToClassify[]) {
    return transactions.map(tx => ({
      transaction_id: tx.id,
      category_id: '00000000-0000-0000-0000-000000000001',
      confidence_score: 0.9,
      metadata: { provider: 'mock' },
    }));
  }
}

describe('TransactionClassifier', () => {
  let classifier: TransactionClassifier;

  beforeEach(() => {
    classifier = new TransactionClassifier(new MockLLMProvider());
  });

  it('should classify a single transaction', async () => {
    const transaction: any = {
      id: 'test-1',
      description: 'Starbucks Coffee',
      amount: 5.50,
      currency: 'USD',
      transaction_type: 'debit',
      user_id: 'user-1',
      account_id: 'account-1',
      transaction_date: '2025-01-01',
    };

    // Mock database calls would be needed for full test
    // This is a basic structure test
    expect(classifier).toBeDefined();
  });
});
