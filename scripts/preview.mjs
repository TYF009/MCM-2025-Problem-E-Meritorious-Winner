import { startPreview } from './preview-server.cjs';
const port = Number(process.argv[2] ?? 8000);
if (!Number.isInteger(port) || port < 0 || port > 65535) throw new RangeError('Invalid preview port.');
const {base} = await startPreview(port);
console.log('Production preview: '+base);
