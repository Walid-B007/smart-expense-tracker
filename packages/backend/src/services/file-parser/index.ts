import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export interface ParsedRow {
  [key: string]: any;
}

export interface ParseResult {
  headers: string[];
  rows: ParsedRow[];
  totalRows: number;
}

export interface ColumnSuggestion {
  sourceColumn: string;
  targetField: 'date' | 'description' | 'amount' | 'currency' | 'transaction_type' | 'reference';
  confidence: number;
  reasoning: string;
}

export class FileParser {
  async parseCSV(fileBuffer: Buffer): Promise<ParseResult> {
    const content = fileBuffer.toString('utf-8');

    return new Promise((resolve, reject) => {
      Papa.parse(content, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false, // Keep everything as strings initially
        complete: (results) => {
          const headers = results.meta.fields || [];
          const rows = results.data as ParsedRow[];

          resolve({
            headers,
            rows,
            totalRows: rows.length,
          });
        },
        error: (error) => {
          reject(new Error(`CSV parsing failed: ${error.message}`));
        },
      });
    });
  }

  async parseXLSX(fileBuffer: Buffer): Promise<ParseResult> {
    try {
      const workbook = XLSX.read(fileBuffer, { type: 'buffer', cellDates: true });

      // Use first sheet
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Convert to JSON with raw values to handle dates properly
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        raw: false, // Don't use raw values, convert to strings
        dateNF: 'yyyy-mm-dd' // Normalize date format
      });

      if (jsonData.length === 0) {
        throw new Error('Empty spreadsheet');
      }

      // First row is headers
      const headers = jsonData[0].map((h: any) => String(h || '').trim());

      // Rest are data rows
      const rows: ParsedRow[] = [];
      for (let i = 1; i < jsonData.length; i++) {
        const row: ParsedRow = {};
        for (let j = 0; j < headers.length; j++) {
          const value = jsonData[i][j];

          // Handle date values specifically
          if (value instanceof Date) {
            // Convert to ISO date string (YYYY-MM-DD)
            row[headers[j]] = value.toISOString().split('T')[0];
          } else if (value !== undefined && value !== null) {
            row[headers[j]] = String(value);
          } else {
            row[headers[j]] = '';
          }
        }
        rows.push(row);
      }

      return {
        headers,
        rows: rows.filter((row) => Object.values(row).some((v) => v !== '')), // Remove empty rows
        totalRows: rows.length,
      };
    } catch (error: any) {
      throw new Error(`XLSX parsing failed: ${error.message}`);
    }
  }

  async parse(fileBuffer: Buffer, fileType: 'csv' | 'xlsx'): Promise<ParseResult> {
    if (fileType === 'csv') {
      return this.parseCSV(fileBuffer);
    } else if (fileType === 'xlsx') {
      return this.parseXLSX(fileBuffer);
    } else {
      throw new Error(`Unsupported file type: ${fileType}`);
    }
  }

  suggestColumnMapping(headers: string[]): ColumnSuggestion[] {
    const suggestions: ColumnSuggestion[] = [];

    const datePatterns = [
      /date/i,
      /posted/i,
      /transaction.*date/i,
      /trans.*date/i,
      /datetime/i,
    ];
    const descPatterns = [
      /desc/i,
      /description/i,
      /merchant/i,
      /memo/i,
      /detail/i,
      /name/i,
    ];
    const amountPatterns = [
      /amount/i,
      /value/i,
      /total/i,
      /sum/i,
      /price/i,
    ];
    const currencyPatterns = [
      /currency/i,
      /curr/i,
      /ccy/i,
    ];
    const typePatterns = [
      /type/i,
      /debit.*credit/i,
      /transaction.*type/i,
      /dr.*cr/i,
    ];
    const refPatterns = [
      /ref/i,
      /reference/i,
      /transaction.*id/i,
      /confirmation/i,
      /receipt/i,
    ];

    for (const header of headers) {
      let matched = false;

      // Date
      for (const pattern of datePatterns) {
        if (pattern.test(header)) {
          suggestions.push({
            sourceColumn: header,
            targetField: 'date',
            confidence: 0.9,
            reasoning: `Column name "${header}" matches date pattern`,
          });
          matched = true;
          break;
        }
      }
      if (matched) continue;

      // Description
      for (const pattern of descPatterns) {
        if (pattern.test(header)) {
          suggestions.push({
            sourceColumn: header,
            targetField: 'description',
            confidence: 0.85,
            reasoning: `Column name "${header}" matches description pattern`,
          });
          matched = true;
          break;
        }
      }
      if (matched) continue;

      // Amount
      for (const pattern of amountPatterns) {
        if (pattern.test(header)) {
          suggestions.push({
            sourceColumn: header,
            targetField: 'amount',
            confidence: 0.9,
            reasoning: `Column name "${header}" matches amount pattern`,
          });
          matched = true;
          break;
        }
      }
      if (matched) continue;

      // Currency
      for (const pattern of currencyPatterns) {
        if (pattern.test(header)) {
          suggestions.push({
            sourceColumn: header,
            targetField: 'currency',
            confidence: 0.95,
            reasoning: `Column name "${header}" matches currency pattern`,
          });
          matched = true;
          break;
        }
      }
      if (matched) continue;

      // Transaction Type
      for (const pattern of typePatterns) {
        if (pattern.test(header)) {
          suggestions.push({
            sourceColumn: header,
            targetField: 'transaction_type',
            confidence: 0.8,
            reasoning: `Column name "${header}" matches transaction type pattern`,
          });
          matched = true;
          break;
        }
      }
      if (matched) continue;

      // Reference
      for (const pattern of refPatterns) {
        if (pattern.test(header)) {
          suggestions.push({
            sourceColumn: header,
            targetField: 'reference',
            confidence: 0.7,
            reasoning: `Column name "${header}" matches reference pattern`,
          });
          matched = true;
          break;
        }
      }
    }

    return suggestions;
  }

  validateRow(
    row: ParsedRow,
    mapping: Record<string, string>
  ): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Date validation
    if (mapping.date) {
      const dateValue = row[mapping.date];
      if (!dateValue) {
        errors.push('Date is required');
      } else if (!this.isValidDate(dateValue)) {
        errors.push(`Invalid date format: "${dateValue}"`);
      }
    } else {
      errors.push('Date column not mapped');
    }

    // Description validation
    if (mapping.description) {
      const desc = row[mapping.description];
      if (!desc || String(desc).trim().length === 0) {
        errors.push('Description is required');
      }
    } else {
      errors.push('Description column not mapped');
    }

    // Amount validation
    if (mapping.amount) {
      const amount = row[mapping.amount];
      if (!amount) {
        errors.push('Amount is required');
      } else if (!this.isValidAmount(amount)) {
        errors.push(`Invalid amount format: "${amount}"`);
      } else if (parseFloat(String(amount).replace(/[^0-9.-]/g, '')) === 0) {
        warnings.push('Amount is zero');
      }
    } else {
      errors.push('Amount column not mapped');
    }

    // Currency validation (optional)
    if (mapping.currency) {
      const currency = row[mapping.currency];
      if (currency && !this.isValidCurrency(currency)) {
        warnings.push(`Non-standard currency code: "${currency}"`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private isValidDate(value: any): boolean {
    if (!value) return false;

    // Try to parse various date formats
    const dateStr = String(value);
    const date = new Date(dateStr);

    if (!isNaN(date.getTime())) {
      return true;
    }

    // Try common formats: MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD
    const patterns = [
      /^\d{1,2}\/\d{1,2}\/\d{4}$/,
      /^\d{4}-\d{2}-\d{2}$/,
      /^\d{2}-\d{2}-\d{4}$/,
    ];

    return patterns.some((pattern) => pattern.test(dateStr));
  }

  private isValidAmount(value: any): boolean {
    if (!value) return false;

    // Remove common currency symbols and thousands separators
    const cleaned = String(value).replace(/[$€£¥,\s]/g, '');

    // Check if it's a valid number
    return /^-?\d+(\.\d{1,2})?$/.test(cleaned);
  }

  private isValidCurrency(value: any): boolean {
    if (!value) return false;

    const currency = String(value).toUpperCase();

    // Common currency codes
    const commonCurrencies = [
      'USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD',
      'CNY', 'HKD', 'SGD', 'INR', 'MXN', 'BRL', 'ZAR', 'RUB',
    ];

    return commonCurrencies.includes(currency) || /^[A-Z]{3}$/.test(currency);
  }

  parseAmount(value: any): number {
    if (!value) return 0;

    // Remove currency symbols, thousands separators, and whitespace
    const cleaned = String(value).replace(/[$€£¥,\s]/g, '');

    return parseFloat(cleaned) || 0;
  }

  parseDate(value: any): Date | null {
    if (!value) return null;

    try {
      // Handle string dates
      const dateStr = String(value).trim();

      // Try ISO format first (YYYY-MM-DD)
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const date = new Date(dateStr + 'T00:00:00.000Z');
        if (!isNaN(date.getTime()) && date.getFullYear() > 1900 && date.getFullYear() < 2100) {
          return date;
        }
      }

      // Try parsing as Date object
      const date = new Date(dateStr);
      if (!isNaN(date.getTime()) && date.getFullYear() > 1900 && date.getFullYear() < 2100) {
        return date;
      }

      // Try common formats: MM/DD/YYYY or DD/MM/YYYY
      const parts = dateStr.split(/[\/\-]/);
      if (parts.length === 3) {
        // Try MM/DD/YYYY first (US format)
        const testDate1 = new Date(`${parts[2]}-${parts[0]}-${parts[1]}T00:00:00.000Z`);
        if (!isNaN(testDate1.getTime()) && testDate1.getFullYear() > 1900 && testDate1.getFullYear() < 2100) {
          return testDate1;
        }

        // Try DD/MM/YYYY (European format)
        const testDate2 = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00.000Z`);
        if (!isNaN(testDate2.getTime()) && testDate2.getFullYear() > 1900 && testDate2.getFullYear() < 2100) {
          return testDate2;
        }
      }

      return null;
    } catch (error) {
      // If any error occurs during parsing, return null instead of crashing
      console.warn(`Failed to parse date: ${value}`, error);
      return null;
    }
  }
}

export const fileParser = new FileParser();
