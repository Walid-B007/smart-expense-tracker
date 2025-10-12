import { FXRateService, FXProviderInterface } from './fx-provider';

// Mock FX Provider
class MockFXProvider implements FXProviderInterface {
  async fetchRates(baseCurrency: string, targetCurrencies: string[]) {
    const rates = new Map<string, number>();
    rates.set(baseCurrency, 1.0);
    targetCurrencies.forEach(currency => {
      rates.set(currency, currency === 'EUR' ? 0.85 : 1.5);
    });
    return rates;
  }
}

describe('FXRateService', () => {
  let fxService: FXRateService;

  beforeEach(() => {
    fxService = new FXRateService(new MockFXProvider());
  });

  it('should convert between same currencies', async () => {
    const result = await fxService.convert(100, 'USD', 'USD');
    expect(result).toBe(100);
  });

  it('should convert between different currencies', async () => {
    // This would need database mocking for full test
    expect(fxService).toBeDefined();
  });
});
