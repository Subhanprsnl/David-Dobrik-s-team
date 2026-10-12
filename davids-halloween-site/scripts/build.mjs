// Build: copy site/ -> dist/, fill in the site URL and RSVP endpoint, and refuse to ship a broken or leaky build.
// No dependencies. Runs on Vercel (`npm run build`) and locally.
import { cp, readFile, writeFile, readdir, rm, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const src = join(root, 'site');
const out = join(root, 'dist');

const host = process.env.SITE_URL
  || (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`)
  || (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`)
  || 'http://localhost:3000';
const siteUrl = host.replace(/\/+$/, '');
const rsvpEndpoint = process.env.RSVP_ENDPOINT ?? (process.env.RSVP_FORWARD_URL ? '/api/rsvp' : '');

async function walk(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(p)); else files.push(p);
  }
  return files;
}
const exists = (p) => stat(p).then(() => true, () => false);

await rm(out, { recursive: true, force: true });
await cp(src, out, { recursive: true });

const problems = [];
for (const file of await walk(out)) {
  if (!/\.(html|js)$/.test(file)) continue;
  let text = await readFile(file, 'utf8');
  text = text.replaceAll('__SITE_URL__', siteUrl).replaceAll('__RSVP_ENDPOINT__', rsvpEndpoint);
  await writeFile(file, text);
  const rel = relative(out, file);
  // The street address must never ship: guests get it by text after they RSVP.
  if (/3703|alomar/i.test(text.replace(/data:[a-z/+]+;base64,[A-Za-z0-9+/=]+/g, ''))) problems.push(`${rel}: contains the street address`);
  for (const [, ref] of text.matchAll(/["'(](\/assets\/[^"')\s]+)/g)) {
    if (!(await exists(join(out, ref)))) problems.push(`${rel}: missing asset ${ref}`);
  }
}

if (problems.length) {
  console.error('Build failed:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log(`Built dist/ for ${siteUrl}  (RSVP: ${rsvpEndpoint || 'demo mode, nothing is sent'})`);
