import axios from 'axios';
import http from 'http';
import https from 'https';
import { config } from '../../config';
import {
  LLMProvider,
  TransactionToClassify,
  ClassificationResult,
  CategoryInfo,
} from './types';
import crypto from 'crypto';

export class DeepSeekProvider implements LLMProvider {
  name = 'deepseek';
  model = 'deepseek-chat';

  private apiKey: string;
  private baseURL: string;
  private categories: CategoryInfo[] = [];
  private maxRetries = 3;
  private retryDelay = 2000; // 2 seconds

  constructor(categories: CategoryInfo[]) {
    this.apiKey = config.DEEPSEEK_API_KEY;
    this.baseURL = config.DEEPSEEK_BASE_URL;
    this.categories = categories;
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async classify(transaction: TransactionToClassify): Promise<ClassificationResult> {
    const results = await this.classifyBatch([transaction]);
    return results[0];
  }

  async classifyBatch(
    transactions: TransactionToClassify[]
  ): Promise<ClassificationResult[]> {
    const prompt = this.buildPrompt(transactions);
    const promptHash = crypto.createHash('md5').update(prompt).digest('hex');

    let lastError: any;

    // Retry logic with exponential backoff
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        console.log(`🔄 [DeepSeek] Attempt ${attempt + 1}/${this.maxRetries} for batch of ${transactions.length} transactions`);

        const response = await axios.post(
          `${this.baseURL}/chat/completions`,
          {
            model: this.model,
            messages: [
              {
                role: 'system',
                content: this.getSystemPrompt(),
              },
              {
                role: 'user',
                content: prompt,
              },
            ],
            temperature: 0.3,
            max_tokens: 2000,
          },
          {
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
              'Accept-Encoding': 'identity', // Disable compression to avoid stream issues
            },
            timeout: 120000, // Increase timeout to 120 seconds for batch processing
            decompress: false, // Disable automatic decompression
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            httpAgent: new http.Agent({
              keepAlive: true,
              keepAliveMsecs: 60000,
            }),
            httpsAgent: new https.Agent({
              keepAlive: true,
              keepAliveMsecs: 60000,
              rejectUnauthorized: true,
            }),
          }
        );

        const content = response.data.choices[0]?.message?.content;
        if (!content) {
          throw new Error('No response from LLM');
        }

        console.log(`✅ [DeepSeek] Successfully received response on attempt ${attempt + 1}`);
        const results = this.parseResponse(content, transactions, promptHash);
        return results;
      } catch (error: any) {
        lastError = error;
        const isNetworkError = error.code === 'ECONNRESET' ||
                              error.code === 'ETIMEDOUT' ||
                              error.code === 'ECONNABORTED';

        console.error(`❌ [DeepSeek] Attempt ${attempt + 1} failed:`, {
          message: error.message,
          code: error.code,
          isNetworkError,
        });

        // If this is not the last attempt and it's a network error, retry
        if (attempt < this.maxRetries - 1 && isNetworkError) {
          const delay = this.retryDelay * Math.pow(2, attempt);
          console.log(`⏳ [DeepSeek] Retrying in ${delay}ms...`);
          await this.sleep(delay);
          continue;
        }

        // If it's the last attempt or non-network error, break
        break;
      }
    }

    console.error(`❌ [DeepSeek] All ${this.maxRetries} attempts failed. Falling back to rule-based classification.`);
    console.error('Last error:', lastError);

    // Fallback to rule-based classification
    return transactions.map((tx) => this.ruleBasedClassification(tx, promptHash));
  }

  private getSystemPrompt(): string {
    return `You are an expert financial transaction categorization system.
Your task is to analyze transactions and assign them to the most appropriate category.

Available categories:
${this.categories.map((c) => `- ${c.id}: ${c.name}${c.parent_name ? ` (${c.parent_name})` : ''} [${c.category_type}]`).join('\n')}

Rules:
1. Consider the merchant name, description, amount, and transaction type
2. Income transactions (credits) should be categorized as income categories
3. Expense transactions (debits) should be categorized as expense categories
4. Provide a confidence score between 0.0 and 1.0
5. Use subcategories when they provide better specificity

Respond with a JSON array of classifications in this exact format:
[
  {
    "transaction_id": "string",
    "category_id": "string",
    "confidence_score": number,
    "reasoning": "brief explanation"
  }
]`;
  }

  private buildPrompt(transactions: TransactionToClassify[]): string {
    const txList = transactions.map((tx, idx) => {
      return `${idx + 1}. ID: ${tx.id}
   Description: ${tx.description}
   Merchant: ${tx.merchant_name || 'N/A'}
   Amount: ${tx.amount} ${tx.currency}
   Type: ${tx.transaction_type}`;
    }).join('\n\n');

    return `Categorize these transactions:\n\n${txList}`;
  }

  private parseResponse(
    content: string,
    transactions: TransactionToClassify[],
    promptHash: string
  ): ClassificationResult[] {
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\[[\s\S]*\]/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;

      const parsed = JSON.parse(jsonStr);
      const results: ClassificationResult[] = [];

      for (const item of parsed) {
        results.push({
          transaction_id: item.transaction_id,
          category_id: item.category_id,
          confidence_score: Math.min(1, Math.max(0, item.confidence_score)),
          metadata: {
            reasoning: item.reasoning,
            prompt_hash: promptHash,
            provider: this.name,
            model: this.model,
          },
        });
      }

      // Fill in any missing transactions with fallback
      const resultIds = new Set(results.map((r) => r.transaction_id));
      for (const tx of transactions) {
        if (!resultIds.has(tx.id)) {
          results.push(this.ruleBasedClassification(tx, promptHash));
        }
      }

      return results;
    } catch (error) {
      console.error('Failed to parse LLM response:', error);
      return transactions.map((tx) => this.ruleBasedClassification(tx, promptHash));
    }
  }

  private ruleBasedClassification(
    transaction: TransactionToClassify,
    promptHash: string
  ): ClassificationResult {
    const description = transaction.description.toLowerCase();
    const merchant = transaction.merchant_name?.toLowerCase() || '';
    const isIncome = transaction.transaction_type === 'credit';

    // Simple keyword-based classification
    let categoryId = '00000000-0000-0000-0000-000000000015'; // Other Expenses
    let confidence = 0.3;

    if (isIncome) {
      if (description.includes('salary') || description.includes('payroll')) {
        categoryId = '00000000-0000-0000-0000-000000000101'; // Salary
        confidence = 0.7;
      } else {
        categoryId = '00000000-0000-0000-0000-000000000106'; // Other Income
        confidence = 0.5;
      }
    } else {
      // Expenses
      if (merchant.includes('restaurant') || merchant.includes('food') || description.includes('dining')) {
        categoryId = '00000000-0000-0000-0000-000000000001'; // Food & Dining
        confidence = 0.6;
      } else if (merchant.includes('gas') || merchant.includes('fuel') || merchant.includes('shell') || merchant.includes('chevron')) {
        categoryId = '00000000-0000-0000-0000-000000000031'; // Gas & Fuel
        confidence = 0.7;
      } else if (merchant.includes('grocery') || merchant.includes('walmart') || merchant.includes('target')) {
        categoryId = '00000000-0000-0000-0000-000000000022'; // Groceries
        confidence = 0.6;
      } else if (merchant.includes('netflix') || merchant.includes('spotify') || description.includes('subscription')) {
        categoryId = '00000000-0000-0000-0000-000000000012'; // Subscriptions
        confidence = 0.7;
      } else if (merchant.includes('uber') || merchant.includes('lyft')) {
        categoryId = '00000000-0000-0000-0000-000000000034'; // Ride Share
        confidence = 0.8;
      } else if (description.includes('electricity') || description.includes('electric')) {
        categoryId = '00000000-0000-0000-0000-000000000051'; // Electricity
        confidence = 0.7;
      } else if (description.includes('internet') || merchant.includes('comcast')) {
        categoryId = '00000000-0000-0000-0000-000000000053'; // Internet
        confidence = 0.7;
      }
    }

    return {
      transaction_id: transaction.id,
      category_id: categoryId,
      confidence_score: confidence,
      metadata: {
        reasoning: 'Rule-based fallback classification',
        prompt_hash: promptHash,
        provider: 'rules',
        model: 'keyword-matching',
      },
    };
  }
}
