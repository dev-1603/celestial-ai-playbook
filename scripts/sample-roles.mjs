import { loadRoles } from './lib/load-roles.mjs';

const roles = loadRoles();
const sample = roles.slice(0, 3).map(r => ({
  ...r,
  body: r.body.split('\n').slice(0, 3).join('\n') + '\n...[truncated]',
}));
console.log(JSON.stringify(sample, null, 2));
