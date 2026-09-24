const fs = require('fs');
const sql = fs.readFileSync('supabase/ALL_MIGRATIONS_COMBINED.sql', 'utf8');
const lines = sql.split('\n');

let missing = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (/^\s*CREATE\s+POLICY\s+/i.test(line)) {
    const prev = lines[i - 1] || '';
    if (!prev.includes('DROP POLICY IF EXISTS')) {
      console.log('Missing DROP POLICY at line ' + (i + 1) + ': ' + line);
      missing++;
    }
  }
  if (/^\s*CREATE\s+TRIGGER\s+/i.test(line)) {
    const prev = lines[i - 1] || '';
    if (!prev.includes('DROP TRIGGER IF EXISTS')) {
      console.log('Missing DROP TRIGGER at line ' + (i + 1) + ': ' + line);
      missing++;
    }
  }
}
console.log('Validation finished. Missing count: ' + missing);
