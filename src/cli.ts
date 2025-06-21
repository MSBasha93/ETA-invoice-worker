// src/cli.ts
import { runFullSync } from './services/syncService';
import { logger } from './utils/logger';

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--run-sync')) {
    logger.info('Manual sync triggered via CLI.');
    try {
      await runFullSync();
      logger.info('Manual sync completed successfully.');
      process.exit(0);
    } catch (error) {
      // --- ENHANCED ERROR LOGGING ---
      logger.error({
          message: 'Manual sync failed with an unhandled exception.',
          error: error,
          // If the error has a stack trace, include it.
          stack: error instanceof Error ? error.stack : 'No stack available'
      }, 'FATAL SYNC ERROR');

      // Also log raw to the console just in case pino is hiding details
      console.error("\n--- RAW ERROR ---");
      console.error(error);
      console.error("--- END RAW ERROR ---\n");
      
      process.exit(1);
    }
  } else {
    logger.info('ETA Worker CLI. Use --run-sync to trigger a manual data sync.');
  }
}

main();