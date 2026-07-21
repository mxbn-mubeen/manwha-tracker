import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import input from 'input';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

const apiId = parseInt(process.env.TELEGRAM_API_ID || '0');
const apiHash = process.env.TELEGRAM_API_HASH || '';

if (!apiId || !apiHash) {
  console.error('TELEGRAM_API_ID or TELEGRAM_API_HASH is missing in .env');
  process.exit(1);
}

const stringSession = new StringSession('');

(async () => {
  console.log('Logging in to Telegram...');
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: async () => await input.text('Please enter your phone number (e.g. +1234567890): '),
    password: async () => await input.text('Please enter your 2FA password (if any): '),
    phoneCode: async () => await input.text('Please enter the OTP code you received: '),
    onError: (err) => console.log(err),
  });

  console.log('You are now connected!');
  const sessionString = client.session.save() as unknown as string;

  // Read existing .env
  const envPath = path.resolve(__dirname, '../../.env');
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  // Update or append TELEGRAM_SESSION
  if (envContent.includes('TELEGRAM_SESSION=')) {
    envContent = envContent.replace(/TELEGRAM_SESSION=.*/, `TELEGRAM_SESSION=${sessionString}`);
  } else {
    envContent += `\nTELEGRAM_SESSION=${sessionString}\n`;
  }

  fs.writeFileSync(envPath, envContent, 'utf8');
  console.log('Successfully saved session to .env file!');
  
  await client.disconnect();
  process.exit(0);
})();
