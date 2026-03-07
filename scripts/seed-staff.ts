import bcrypt from 'bcryptjs';

// Generate bcrypt hashes for the launch staff accounts
// Run: npx tsx scripts/seed-staff.ts

async function main() {
  const adminHash = await bcrypt.hash('CenterBook2026!', 12);
  const superHash = await bcrypt.hash('Starlight2026!', 12);

  console.log('=== Bcrypt Hashes for cb_staff seed ===\n');
  console.log('Admin (Bincy & Nicole):', adminHash);
  console.log('Superuser (Steve):     ', superHash);
  console.log('\n=== SQL ===\n');
  console.log(`INSERT INTO cb_staff (first_name, last_name, email, password_hash, role, is_active)
VALUES
  ('Bincy',  'Sines',     'bincyteo@gmail.com',    '${adminHash}', 'admin',     TRUE),
  ('Nicole', 'Edmondson', 'nicoleedmo@gmail.com',  '${adminHash}', 'admin',     TRUE),
  ('Steve',  'Edmondson', 'steve@starlightgr.com', '${superHash}', 'superuser', TRUE);`);
}

main();
