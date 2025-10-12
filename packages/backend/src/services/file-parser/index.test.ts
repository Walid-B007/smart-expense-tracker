import { FileParser } from './index';

describe('FileParser', () => {
  let parser: FileParser;

  beforeEach(() => {
    parser = new FileParser();
  });

  describe('suggestColumnMapping', () => {
    it('should suggest date column', () => {
      const headers = ['Transaction Date', 'Description', 'Amount'];
      const suggestions = parser.suggestColumnMapping(headers);

      const dateSuggestion = suggestions.find(s => s.targetField === 'date');
      expect(dateSuggestion).toBeDefined();
      expect(dateSuggestion?.sourceColumn).toBe('Transaction Date');
    });

    it('should suggest amount column', () => {
      const headers = ['Date', 'Merchant', 'Total Amount'];
      const suggestions = parser.suggestColumnMapping(headers);

      const amountSuggestion = suggestions.find(s => s.targetField === 'amount');
      expect(amountSuggestion).toBeDefined();
      expect(amountSuggestion?.sourceColumn).toBe('Total Amount');
    });
  });

  describe('validateRow', () => {
    it('should validate valid row', () => {
      const row = {
        date: '2025-01-01',
        description: 'Test Transaction',
        amount: '100.50',
      };
      const mapping = { date: 'date', description: 'description', amount: 'amount' };

      const result = parser.validateRow(row, mapping);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const row = { date: '2025-01-01' };
      const mapping = { date: 'date', description: 'description', amount: 'amount' };

      const result = parser.validateRow(row, mapping);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect invalid date format', () => {
      const row = {
        date: 'not-a-date',
        description: 'Test',
        amount: '100',
      };
      const mapping = { date: 'date', description: 'description', amount: 'amount' };

      const result = parser.validateRow(row, mapping);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('date'))).toBe(true);
    });
  });

  describe('parseAmount', () => {
    it('should parse simple amount', () => {
      expect(parser.parseAmount('100.50')).toBe(100.50);
    });

    it('should parse amount with currency symbol', () => {
      expect(parser.parseAmount('$1,234.56')).toBe(1234.56);
    });

    it('should parse negative amount', () => {
      expect(parser.parseAmount('-50.00')).toBe(-50);
    });
  });
});
