import { neon } from '@netlify/neon';
const sql = neon();
async function seed() {
  await sql`CREATE TABLE IF NOT EXISTS problems (
    id SERIAL PRIMARY KEY,
    subject TEXT NOT NULL,
    grade INTEGER NOT NULL,
    content TEXT NOT NULL
  )`;
  await sql`INSERT INTO problems (subject, grade, content) VALUES
    ('Math', 1, 'Solve: 2 + 3 = ?'),
    ('English', 1, 'Spell "cat"')`;
  console.log('Seeded data');
}
seed();
