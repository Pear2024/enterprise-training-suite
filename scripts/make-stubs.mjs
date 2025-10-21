// scripts/make-stubs.mjs
import fs from 'fs';
import path from 'path';

const targets = [
  'app/(employee)/dashboard',
  'app/(employee)/assignments/[id]',
  'app/(employee)/assignments/[id]/quiz',
  'app/(employee)/certificates/[id]',
  'app/(trainer)/topics',
  'app/(trainer)/topics/new',
  'app/(trainer)/topics/[id]/edit',
  'app/(trainer)/assign',
  'app/(trainer)/progress',
  'app/(admin)/users',
  'app/(admin)/departments',
  'app/(admin)/imports',
  'app/(admin)/reports',
  'app/(admin)/settings'
];

function titleFrom(p){
  return p
    .replace(/^app\//,'')
    .replace(/\(employee\)/,'employee')
    .replace(/\(trainer\)/,'trainer')
    .replace(/\(admin\)/,'admin')
    .replace(/\[id\]/,'{id}')
    .split('/').join(' / ');
}

for (const dir of targets) {
  const file = path.join(dir, 'page.tsx');
  if (!fs.existsSync(file)) {
    fs.mkdirSync(dir, { recursive: true });
    const title = titleFrom(dir);
    const content =
`export default function Page() {
  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold">${title}</h1>
      <p className="text-sm text-gray-600 mt-2">Stub page — ready to build.</p>
    </main>
  );
}
`;
    fs.writeFileSync(file, content);
    console.log('Created', file);
  }
}
console.log('✅ Stub pages created where missing.');
