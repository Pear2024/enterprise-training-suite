// scripts/make-tree.mjs
import { promises as fs } from 'fs';
import { globby } from 'globby';

const ui = await globby(['app/**/page.@(ts|tsx)'], { gitignore: true, ignore: ['**/.next/**','**/node_modules/**']});
const api = await globby(['app/api/**/route.@(ts|tsx)'], { gitignore: true, ignore: ['**/.next/**','**/node_modules/**']});

function toRoute(p){ 
  return p.replace(/^app\//,'/').replace(/\/page\.(ts|tsx)$/,'').replace(/\/route\.(ts|tsx)$/,'');
}

const report = [
  '# Route Report',
  '## UI Pages',
  ...ui.map(f => `- ${toRoute(f) || '/'}`),
  '',
  '## API Routes',
  ...api.map(f => `- ${toRoute(f)}`),
].join('\n');

await fs.writeFile('route-report.md', report);
console.log('Wrote route-report.md');
