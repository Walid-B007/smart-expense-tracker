import { FastifyPluginAsync } from 'fastify';
import { fxService } from '../services/fx/fx-provider';

const getCurrencyName = (code: string): string => {
  const names: { [key: string]: string } = {
    USD: 'US Dollar',
    EUR: 'Euro',
    GBP: 'British Pound',
    AUD: 'Australian Dollar',
    CAD: 'Canadian Dollar',
    JPY: 'Japanese Yen',
    CNY: 'Chinese Yuan',
    CHF: 'Swiss Franc',
    NZD: 'New Zealand Dollar',
    SGD: 'Singapore Dollar',
  };
  return names[code] || code;
};

export const fxRoutes: FastifyPluginAsync = async (fastify) => {
  // Get supported currencies
  fastify.get('/currencies', async (request, reply) => {
    const currencies = ['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'JPY', 'CNY', 'CHF', 'NZD', 'SGD'];
    return {
      currencies: currencies.map(code => ({
        code,
        name: getCurrencyName(code)
      }))
    };
  });

  // Get exchange rate
  fastify.get('/rate', async (request, reply) => {
    const {
      from,
      to,
      date,
    } = request.query as {
      from: string;
      to: string;
      date?: string;
    };

    if (!from || !to) {
      return reply.status(400).send({ error: 'from and to currencies are required' });
    }

    const rateDate = date ? new Date(date) : new Date();
    const rate = await fxService.getRate(from, to, rateDate);

    if (rate === null) {
      return reply.status(404).send({ error: 'Rate not found' });
    }

    return { from, to, rate, date: rateDate.toISOString().split('T')[0] };
  });

  // Convert amount
  fastify.get('/convert', async (request, reply) => {
    const {
      amount,
      from,
      to,
      date,
    } = request.query as {
      amount: string;
      from: string;
      to: string;
      date?: string;
    };

    if (!amount || !from || !to) {
      return reply.status(400).send({ error: 'amount, from, and to are required' });
    }

    const amountNum = parseFloat(amount);
    const rateDate = date ? new Date(date) : new Date();
    const converted = await fxService.convert(amountNum, from, to, rateDate);

    if (converted === null) {
      return reply.status(404).send({ error: 'Conversion failed' });
    }

    return {
      original_amount: amountNum,
      from_currency: from,
      converted_amount: converted,
      to_currency: to,
      date: rateDate.toISOString().split('T')[0],
    };
  });
};
