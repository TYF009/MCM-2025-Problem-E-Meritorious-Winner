import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const root = new URL('../', import.meta.url);
const snapshot = JSON.parse(readFileSync(new URL('./fixtures/original-artifacts.json',import.meta.url),'utf8'));
function inventory(prefix) {
  return readdirSync(new URL(prefix,root), { withFileTypes:true }).flatMap(entry => {
    if (entry.isDirectory()) return inventory(prefix+entry.name+'/');
    assert.ok(entry.isFile(),prefix+entry.name);
    return [prefix+entry.name];
  });
}

test('all original contest and historical artifacts match pre-M1 main', () => {
  const paths = ['paper/','problem/','figures/','src/'].flatMap(inventory).sort();
  assert.deepEqual(paths,Object.keys(snapshot.files).sort());
  for (const file of paths) {
    const data = readFileSync(new URL(file,root));
    const sha = createHash('sha1').update('blob '+data.length+'\0').update(data).digest('hex');
    assert.equal(sha,snapshot.files[file],file);
  }
});

test('Pages workflow restricts deployment to explicit approval on the expected main SHA', () => {
  const workflow = readFileSync(new URL('.github/workflows/deploy-pages.yml',root),'utf8');
  assert.match(workflow,/workflow_dispatch:/);
  assert.doesNotMatch(workflow,/^  (?:push|pull_request|workflow_run|schedule):/m);
  assert.match(workflow,/github\.ref == 'refs\/heads\/main'/);
  assert.match(workflow,/inputs\.approved_sha == github\.sha/);
  assert.match(workflow,/inputs\.approval == 'publish-approved-main'/);
  assert.match(workflow,/name: github-pages/);
});
