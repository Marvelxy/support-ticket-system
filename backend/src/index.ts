import 'dotenv/config';
import { createServer } from 'http';
import { createApp } from './app.js';
import { initRealtime } from './realtime.js';

const port = Number(process.env.PORT || 4000);
const httpServer = createServer(createApp());
initRealtime(httpServer);
httpServer.listen(port, () =>
  console.log(`API on http://localhost:${port} (ai=${process.env.AI_PROVIDER || 'rule'})`),
);
