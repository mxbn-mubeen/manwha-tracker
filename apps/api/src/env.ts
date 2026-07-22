import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env from root workspace
config({ path: resolve(__dirname, '../../../.env') });
