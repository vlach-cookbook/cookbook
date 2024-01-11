import { Storage } from '@google-cloud/storage';
import express from 'express';
import morgan from 'morgan';
import { exec } from 'node:child_process';
import process from 'node:process';
import util from 'node:util';
import zlib from 'node:zlib';

const execP = util.promisify(exec);

function parseIntOrUndefined(value: any) {
  const result = parseInt(value);
  if (isNaN(result)) return undefined;
  return result;
}

const hostname = process.env.HOST ?? '127.0.0.1';
const port = parseIntOrUndefined(process.env.PORT) ?? 3000;

const app = express();

app.enable('trust proxy');
app.use(morgan('combined'));

app.get('/health', (_req, res) => {
  res.type('text/plain').send('Healthy.');
});

app.post('/backup', async (req, res) => {
  if (req.headers['authorization'] !== `Bearer ${process.env.START_BACKUP_PASSWORD}`) {
    res.status(403).send('Wrong backup password.\n');
    return;
  }

  const storage = new Storage({
    projectId: 'vlach-cookbook',
    credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS!)
  });

  const backupTimestamp = new Date();

  const { stdout: dump } = await execP(`pg_dump --clean --if-exists -O -d "${process.env.DATABASE_URL}"`, { encoding: 'utf-8' });

  const compressed = await util.promisify(zlib.brotliCompress)(dump, {
    params: {
      [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
    }
  });

  const ageProcess = execP(`age -r ${process.env.BACKUP_AGE_RECIPIENT}`, { encoding: 'buffer' });
  ageProcess.child.stdin!.end(compressed);
  const { stdout: encrypted } = await ageProcess;

  const bucket = 'vlach-cookbook-backup';
  const filename = `backup-${backupTimestamp.toISOString()}.br.age`;
  await storage.bucket(bucket).file(filename).save(encrypted);

  res.type('text/plain').send(`Backed up ${encrypted.length} bytes to ${bucket}/${filename}.\n`);

  // When the backup is finished, let the server exit.
  server.close(err => {
    console.log('Server closed.');
    if (err) console.error(err);
    process.exitCode = 0;
  })
});

const server = app.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
