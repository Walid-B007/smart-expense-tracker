import axios from 'axios';
import { config } from '../../config';
import { supabase } from '../../db/supabase';
import { FXRate } from '../../types';
import { format } from 'date-fns';

export interface FXProviderInterface {
  fetchRates(baseCurrency: string, targetCurrencies: string[], date?: Date): Promise<Map<string, number>>;
}

export class ExchangeRateHostProvider implements FXProviderInterface {
  private baseURL: string;
  private apiKey?: string;

  constructor() {
    this.baseURL = config.FX_PROVIDER_URL;
    this.apiKey = config.FX_PROVIDER_KEY;
  }

  async fetchRates(
    baseCurrency: string,
    targetCurrencies: string[],
    date: Date = new Date()
  ): Promise<Map<string, number>> {
    const dateStr = format(date, 'yyyy-MM-dd');
    const rates = new Map<string, number>();

    try {
      const symbols = targetCurrencies.join(',');
      const url = `${this.baseURL}/${dateStr}`;

      const response = await axios.get(url, {
        params: {
          base: baseCurrency,
          symbols,
          ...(this.apiKey && { access_key: this.apiKey }),
        },
        timeout: 10000,
      });

      if (response.data && response.data.rates) {
        for (const [currency, rate] of Object.entries(response.data.rates)) {
          rates.set(currency, rate as number);
        }
      }

      // Always include base currency with rate 1.0
      rates.set(baseCurrency, 1.0);

      return rates;
    } catch (error) {
      console.error('Failed to fetch FX rates:', error);
      throw new Error(`Failed to fetch exchange rates: ${error}`);
    }
  }
}

export class FXRateService {
  private provider: FXProviderInterface;
  private cacheDuration = 24 * 60 * 60 * 1000; // 24 hours

  constructor(provider?: FXProviderInterface) {
    this.provider = provider || new ExchangeRateHostProvider();
  }

  async updateRates(date: Date = new Date()): Promise<number> {
    const dateStr = format(date, 'yyyy-MM-dd');
    const baseCurrencies = ['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'JPY', 'CNY'];
    const targetCurrencies = ['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'JPY', 'CNY', 'CHF', 'NZD', 'SGD'];

    let totalInserted = 0;

    for (const base of baseCurrencies) {
      try {
        const rates = await this.provider.fetchRates(base, targetCurrencies, date);

        const insertData: Partial<FXRate>[] = [];
        for (const [target, rate] of rates.entries()) {
          if (base !== target) {
            insertData.push({
              rate_date: dateStr,
              base_currency: base,
              target_currency: target,
              rate,
              provider: 'exchangerate.host',
              metadata: { updated_at: new Date().toISOString() },
            });
          }
        }

        if (insertData.length > 0) {
          const { error } = await supabase
            .from('fx_rates')
            .upsert(insertData, {
              onConflict: 'rate_date,base_currency,target_currency',
              ignoreDuplicates: false,
            });

          if (error) {
            console.error(`Failed to save rates for ${base}:`, error);
          } else {
            totalInserted += insertData.length;
          }
        }

        // Rate limiting
        await this.sleep(500);
      } catch (error) {
        console.error(`Failed to update rates for ${base}:`, error);
      }
    }

    console.log(`✅ Updated ${totalInserted} FX rates for ${dateStr}`);
    return totalInserted;
  }

  async getRate(
    baseCurrency: string,
    targetCurrency: string,
    date: Date = new Date()
  ): Promise<number | null> {
    if (baseCurrency === targetCurrency) {
      return 1.0;
    }

    const dateStr = format(date, 'yyyy-MM-dd');

    // Try to get from cache (database) first
    const { data, error } = await supabase
      .from('fx_rates')
      .select('rate')
      .eq('rate_date', dateStr)
      .eq('base_currency', baseCurrency)
      .eq('target_currency', targetCurrency)
      .single();

    if (!error && data) {
      return data.rate;
    }

    // If not in cache for exact date, try to get most recent rate (within 7 days)
    const sevenDaysAgo = new Date(date);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = format(sevenDaysAgo, 'yyyy-MM-dd');

    const { data: recentData, error: recentError } = await supabase
      .from('fx_rates')
      .select('rate, rate_date')
      .eq('base_currency', baseCurrency)
      .eq('target_currency', targetCurrency)
      .gte('rate_date', sevenDaysAgoStr)
      .lte('rate_date', dateStr)
      .order('rate_date', { ascending: false })
      .limit(1)
      .single();

    if (!recentError && recentData) {
      console.log(`📊 [FX] Using recent rate from ${recentData.rate_date} for ${baseCurrency}/${targetCurrency}`);
      return recentData.rate;
    }

    // Try to fetch and cache from external provider
    try {
      const rates = await this.provider.fetchRates(baseCurrency, [targetCurrency], date);
      const rate = rates.get(targetCurrency);

      if (rate) {
        // Save to cache
        await supabase.from('fx_rates').upsert({
          rate_date: dateStr,
          base_currency: baseCurrency,
          target_currency: targetCurrency,
          rate,
          provider: 'exchangerate.host',
          metadata: { updated_at: new Date().toISOString() },
        });

        return rate;
      }
    } catch (error) {
      console.error(`⚠️ [FX] Failed to fetch rate from provider for ${baseCurrency}/${targetCurrency}:`, error instanceof Error ? error.message : error);
    }

    // Fallback: use approximate rates for common currency pairs
    const fallbackRates = this.getFallbackRate(baseCurrency, targetCurrency);
    if (fallbackRates !== null) {
      console.log(`⚠️ [FX] Using fallback rate for ${baseCurrency}/${targetCurrency}: ${fallbackRates}`);
    }

    return fallbackRates;
  }

  private getFallbackRate(baseCurrency: string, targetCurrency: string): number | null {
    // Approximate rates as of late 2024 - these are rough estimates
    const rates: { [key: string]: { [key: string]: number } } = {
      USD: { EUR: 0.92, GBP: 0.79, AUD: 1.52, CAD: 1.36, JPY: 149.5, CNY: 7.24 },
      EUR: { USD: 1.09, GBP: 0.86, AUD: 1.65, CAD: 1.48, JPY: 162.8, CNY: 7.88 },
      GBP: { USD: 1.27, EUR: 1.16, AUD: 1.92, CAD: 1.72, JPY: 189.7, CNY: 9.18 },
      AUD: { USD: 0.66, EUR: 0.61, GBP: 0.52, CAD: 0.89, JPY: 98.4, CNY: 4.76 },
      CAD: { USD: 0.74, EUR: 0.67, GBP: 0.58, AUD: 1.12, JPY: 110.3, CNY: 5.33 },
      JPY: { USD: 0.0067, EUR: 0.0061, GBP: 0.0053, AUD: 0.010, CAD: 0.0091, CNY: 0.048 },
      CNY: { USD: 0.14, EUR: 0.13, GBP: 0.11, AUD: 0.21, CAD: 0.19, JPY: 20.6 },
    };

    return rates[baseCurrency]?.[targetCurrency] || null;
  }

  async convert(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    date: Date = new Date()
  ): Promise<number | null> {
    const rate = await this.getRate(fromCurrency, toCurrency, date);
    if (rate === null) {
      return null;
    }
    return amount * rate;
  }

  async convertMultiple(
    amounts: Array<{ amount: number; currency: string; date?: Date }>,
    targetCurrency: string
  ): Promise<Array<number | null>> {
    const results: Array<number | null> = [];

    for (const { amount, currency, date } of amounts) {
      const converted = await this.convert(amount, currency, targetCurrency, date || new Date());
      results.push(converted);
    }

    return results;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const fxService = new FXRateService();
