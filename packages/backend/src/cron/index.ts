import cron from 'node-cron';
import { fxService } from '../services/fx/fx-provider';

export function startCronJobs() {
  // Update FX rates daily at 1 AM
  cron.schedule('0 1 * * *', async () => {
    console.log('🔄 Starting daily FX rate update...');
    try {
      const count = await fxService.updateRates();
      console.log(`✅ Updated ${count} FX rates`);
    } catch (error) {
      console.error('❌ FX rate update failed:', error);
    }
  });

  console.log('✅ Cron jobs started');
}
