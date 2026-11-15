import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
const dir = process.argv[2] ?? 'release-reports';
mkdirSync(dir,{recursive:true});
const suites = ['story','ecology','decision','companion'];
let failed = false;
for (const suite of suites) {
  console.log('Browser suite: ' + suite);
  const result = spawnSync(process.execPath,['tests/'+suite+'-browser.cjs',dir],{stdio:'inherit',timeout:120000});
  if (result.error) console.error(result.error.message);
  failed ||= result.status !== 0;
}
process.exitCode = failed ? 1 : 0;
