const faunadb = require('faunadb');
const q = faunadb.query;
const client = new faunadb.Client({ secret: process.env.FAUNADB_KEY });

exports.handler = async (event) => {
  const { userId, subject, grade, progress } = JSON.parse(event.body);
  if (!userId || !subject || !grade || !progress) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
  }

  try {
    const result = await client.query(
      q.Create(q.Collection('Progress'), {
        data: { userId, subject, grade, progress, timestamp: Date.now() }
      })
    );
    return { statusCode: 200, body: JSON.stringify(result) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to save progress' }) };
  }
};