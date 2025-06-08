exports.handler = async function(event) {
  const { neon } = require('@netlify/neon');
  const sql = neon();
  try {
    const [result] = await sql`SELECT * FROM problems WHERE grade = ${grade}`;
    return {
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error fetching problem:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch problem' }),
    };
  }
};
