const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all students
router.get('/', async (req, res) => {
  try {
    const [results] = await db.execute("SELECT * FROM students");
    res.json(results);
  } catch(err) {
    console.log("DB ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get students with their exam results and exam information
router.get('/with-results', async (req, res) => {
  try {
    const [students] = await db.execute(`
      SELECT s.*, 
             COUNT(DISTINCT e.exam_id) as total_exams_available,
             COUNT(DISTINCT r.result_id) as exams_attempted,
             MAX(r.percentage) as highest_score,
             AVG(r.percentage) as average_score
      FROM students s
      LEFT JOIN exams e ON s.exam_type = e.exam_type
      LEFT JOIN results r ON s.student_id = r.attempt_id
      GROUP BY s.student_id
      ORDER BY s.student_name
    `);
    
    // Get detailed results for each student
    const studentsWithDetails = await Promise.all(students.map(async (student) => {
      const [studentResults] = await db.execute(`
        SELECT r.*, e.exam_name, e.exam_type, e.exam_date, e.exam_time
        FROM results r
        LEFT JOIN exams e ON r.attempt_id = e.exam_id
        WHERE r.attempt_id = ?
        ORDER BY r.generated_at DESC
      `, [student.student_id]);
      
      const [availableExams] = await db.execute(`
        SELECT exam_id, exam_name, exam_date, exam_time, duration_minutes, total_questions
        FROM exams
        WHERE exam_type = ?
        ORDER BY exam_date DESC
      `, [student.exam_type]);
      
      return {
        ...student,
        results: studentResults,
        available_exams: availableExams,
        performance_summary: {
          total_exams_available: student.total_exams_available || 0,
          exams_attempted: student.exams_attempted || 0,
          highest_score: student.highest_score || 0,
          average_score: student.average_score || 0
        }
      };
    }));
    
    res.json(studentsWithDetails);
  } catch(err) {
    console.log("DB ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// Add new student
router.post('/add', async (req, res) => {
  console.log("BODY RECEIVED:", req.body);

  const { student_name, batch_name, admission_year, roll_no, mobile_no, email, password_hash, exam_type, city, state, college_name } = req.body;

  if(!student_name || !batch_name || !admission_year || !roll_no || !mobile_no || !email || !password_hash) {
    return res.status(400).json({ message: "Please fill all required fields!" });
  }

  try {
    const [result] = await db.execute(
      `INSERT INTO students 
      (student_name, batch_name, admission_year, roll_no, mobile_no, email, password_hash, exam_type, city, state, college_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [student_name, batch_name, admission_year, roll_no, mobile_no, email, password_hash, exam_type || 'NDA', city, state, college_name]
    );
    res.json({ message: "Student added successfully!", student_id: result.insertId });
  } catch(err) {
    console.log("DB ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// UPDATE student
router.put('/update/:id', async (req, res) => {
  const id = req.params.id;
  const { student_name, batch_name, mobile_no, email } = req.body;

  if(!student_name || !batch_name || !mobile_no || !email){
    return res.status(400).json({ message: "All fields required!" });
  }

  try {
    await db.execute(
      `UPDATE students 
      SET student_name=?, batch_name=?, mobile_no=?, email=?
      WHERE student_id=?`,
      [student_name, batch_name, mobile_no, email, id]
    );
    res.json({ message: "Student updated successfully!" });
  } catch(err) {
    console.log("DB ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE student
router.delete('/delete/:id', async (req, res) => {
  const id = req.params.id;

  try {
    await db.execute("DELETE FROM students WHERE student_id = ?", [id]);
    res.json({ message: "Student deleted successfully!" });
  } catch(err) {
    console.log("DB ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// Student login
router.post('/login', async (req, res) => {
  console.log("LOGIN BODY:", req.body);

  const { email, password } = req.body;

  if(!email || !password) return res.status(400).json({ message: "Email and password required" });

  try {
    const [results] = await db.execute(
      "SELECT * FROM students WHERE email = ? AND password_hash = ?",
      [email, password]
    );
    
    if(results.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    res.json({ message: "Login successful", student: results[0] });
  } catch(err) {
    console.log("DB ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;