import mysql from 'mysql2/promise';

export const config = {
  api: {
    bodyParser: true,
  },
};

let pool;

const getPool = () => {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: parseInt(process.env.DB_PORT || '3306'),
      ssl: process.env.DB_SSL_MODE === 'REQUIRED' ? { rejectUnauthorized: false } : undefined
    });
  }
  return pool;
};

export default async function handler(req, res) {
  const path = req.url?.replace('/api/', '').replace(/\?.*/, '') || '';
  const db = getPool();
  
  try {
    if (req.method === 'GET') {
      if (path === 'admin' || path === '') {
        const [results] = await db.execute('SELECT * FROM admin');
        return res.status(200).json(results);
      }
      if (path === 'students') {
        const [results] = await db.query('SELECT * FROM students ORDER BY student_name');
        return res.status(200).json(results);
      }
      if (path === 'exams') {
        const [results] = await db.query('SELECT * FROM exams ORDER BY created_at DESC');
        return res.status(200).json(results);
      }
      if (path === 'admin-results') {
        const [results] = await db.query('SELECT ea.*, s.student_name, s.roll_no, e.exam_name FROM exam_attempts ea JOIN students s ON ea.student_id = s.student_id JOIN exams e ON ea.exam_id = e.exam_id ORDER BY ea.submitted_at DESC');
        return res.status(200).json(results);
      }
      return res.status(404).json({ error: 'Endpoint not found' });
    }
    
    if (req.method === 'POST') {
      const body = req.body;
      if (path === 'admin/login') {
        const [results] = await db.execute('SELECT * FROM admin WHERE email = ? AND password_hash = ?', [body.email, body.password]);
        if (results.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
        return res.status(200).json({ message: 'Login successful', admin: results[0] });
      }
      if (path === 'students/login') {
        const [results] = await db.execute('SELECT * FROM students WHERE email = ? AND password_hash = ?', [body.email, body.password]);
        if (results.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
        return res.status(200).json({ message: 'Login successful', student: results[0] });
      }
      return res.status(404).json({ error: 'Endpoint not found' });
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}