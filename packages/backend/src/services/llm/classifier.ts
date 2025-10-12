import { supabase } from '../../db/supabase';
import { DeepSeekProvider } from './deepseek-provider';
import { LLMProvider, TransactionToClassify, CategoryInfo } from './types';
import { Transaction, CategorySuggestion } from '../../types';

export class TransactionClassifier {
  private provider: LLMProvider;
  private batchSize = 10;
  private retryAttempts = 3;
  private retryDelay = 1000; // ms

  constructor(provider?: LLMProvider) {
    if (provider) {
      this.provider = provider;
    } else {
      // Default to DeepSeek
      this.provider = null as any; // Will be initialized async
    }
  }

  async initialize() {
    if (!this.provider) {
      const categories = await this.fetchCategories();
      this.provider = new DeepSeekProvider(categories);
    }
  }

  private async fetchCategories(): Promise<CategoryInfo[]> {
    const { data, error } = await supabase
      .from('categories')
      .select(`
        id,
        name,
        category_type,
        parent:parent_id(name)
      `)
      .eq('is_system', true);

    if (error) {
      console.error('Failed to fetch categories:', error);
      return [];
    }

    return data.map((cat: any) => ({
      id: cat.id,
      name: cat.name,
      parent_name: cat.parent?.name,
      category_type: cat.category_type,
    }));
  }

  async classifyTransaction(transaction: Transaction): Promise<CategorySuggestion | null> {
    await this.initialize();

    const toClassify: TransactionToClassify = {
      id: transaction.id,
      description: transaction.description,
      merchant_name: transaction.merchant_name,
      amount: transaction.amount,
      currency: transaction.currency,
      transaction_type: transaction.transaction_type,
    };

    for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
      try {
        const result = await this.provider.classify(toClassify);

        // Save suggestion to database
        const { data, error } = await supabase
          .from('category_suggestions')
          .insert({
            transaction_id: transaction.id,
            category_id: result.category_id,
            confidence_score: result.confidence_score,
            llm_provider: this.provider.name,
            llm_model: this.provider.model,
            prompt_hash: result.metadata?.prompt_hash,
            response_data: result.metadata,
          })
          .select()
          .single();

        if (error) {
          console.error('Failed to save category suggestion:', error);
          return null;
        }

        return data;
      } catch (error) {
        console.error(`Classification attempt ${attempt + 1} failed:`, error);
        if (attempt < this.retryAttempts - 1) {
          await this.sleep(this.retryDelay * Math.pow(2, attempt));
        }
      }
    }

    return null;
  }

  async classifyBatch(transactions: Transaction[]): Promise<CategorySuggestion[]> {
    await this.initialize();

    const suggestions: CategorySuggestion[] = [];

    // Process in batches
    for (let i = 0; i < transactions.length; i += this.batchSize) {
      const batch = transactions.slice(i, i + this.batchSize);
      const toClassify: TransactionToClassify[] = batch.map((tx) => ({
        id: tx.id,
        description: tx.description,
        merchant_name: tx.merchant_name,
        amount: tx.amount,
        currency: tx.currency,
        transaction_type: tx.transaction_type,
      }));

      try {
        const results = await this.provider.classifyBatch(toClassify);

        // Save suggestions
        const insertData = results.map((result) => ({
          transaction_id: result.transaction_id,
          category_id: result.category_id,
          confidence_score: result.confidence_score,
          llm_provider: this.provider.name,
          llm_model: this.provider.model,
          prompt_hash: result.metadata?.prompt_hash,
          response_data: result.metadata,
        }));

        const { data, error } = await supabase
          .from('category_suggestions')
          .insert(insertData)
          .select();

        if (error) {
          console.error('Failed to save batch suggestions:', error);
        } else if (data) {
          suggestions.push(...data);
        }
      } catch (error) {
        console.error('Batch classification failed:', error);
      }

      // Rate limiting delay between batches
      if (i + this.batchSize < transactions.length) {
        await this.sleep(1000);
      }
    }

    return suggestions;
  }

  async autoApplySuggestions(userId: string, minConfidence: number = 0.8): Promise<number> {
    console.log(`🔍 [Auto-Apply] Fetching suggestions with confidence >= ${minConfidence} for user ${userId}`);

    // Get high-confidence suggestions that haven't been accepted/rejected
    const { data: suggestions, error } = await supabase
      .from('category_suggestions')
      .select(`
        id,
        transaction_id,
        category_id,
        confidence_score,
        transaction:transactions(user_id, category_id)
      `)
      .gte('confidence_score', minConfidence)
      .is('is_accepted', null);

    if (error) {
      console.error('❌ [Auto-Apply] Failed to fetch suggestions:', error);
      return 0;
    }

    if (!suggestions || suggestions.length === 0) {
      console.log('⚠️ [Auto-Apply] No suggestions found');
      return 0;
    }

    console.log(`📊 [Auto-Apply] Found ${suggestions.length} high-confidence suggestions`);

    // Filter for this user's transactions without categories
    const toApply = suggestions.filter(
      (s: any) => s.transaction?.user_id === userId && !s.transaction?.category_id
    );

    console.log(`🎯 [Auto-Apply] ${toApply.length} suggestions eligible for auto-apply`);

    let applied = 0;
    for (const suggestion of toApply) {
      console.log(`🔄 [Auto-Apply] Applying category ${suggestion.category_id} to transaction ${suggestion.transaction_id} (confidence: ${suggestion.confidence_score})`);

      const { error: updateError } = await supabase
        .from('transactions')
        .update({ category_id: suggestion.category_id })
        .eq('id', suggestion.transaction_id);

      if (updateError) {
        console.error(`❌ [Auto-Apply] Failed to update transaction ${suggestion.transaction_id}:`, updateError);
      } else {
        await supabase
          .from('category_suggestions')
          .update({ is_accepted: true })
          .eq('id', suggestion.id);
        applied++;
        console.log(`✅ [Auto-Apply] Successfully applied category to transaction ${suggestion.transaction_id}`);
      }
    }

    console.log(`✨ [Auto-Apply] Completed: ${applied}/${toApply.length} categories auto-applied`);
    return applied;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const classifier = new TransactionClassifier();
