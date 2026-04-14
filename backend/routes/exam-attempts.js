const express = require('express');
const router = express.Router();
const db = require('../db');

// Submit exam attempt
router.post('/', async (req, res) => {
    const { student_id, exam_id, answers, time_taken } = req.body;
    
    try {
        // Start transaction
        await db.execute('START TRANSACTION');
        
        // Create exam attempt
        const [attemptResult] = await db.execute(`
            INSERT INTO exam_attempts (student_id, exam_id, start_time, end_time, time_taken, status)
            VALUES (?, ?, NOW(), NOW(), ?, 'COMPLETED')
        `, [student_id, exam_id, time_taken]);
        
        const attemptId = attemptResult.insertId;
        
        // Insert student responses
        for (const [questionId, selectedAnswer] of Object.entries(answers)) {
            // Get correct answer for this question
            const [correctAnswer] = await db.execute(`
                SELECT qo.option_label 
                FROM question_options qo
                WHERE qo.question_id = ? AND qo.is_correct = 1
            `, [questionId]);
            
            const isCorrect = correctAnswer.length > 0 && correctAnswer[0].option_label === selectedAnswer ? 1 : 0;
            
            // Insert student response
            await db.execute(`
                INSERT INTO student_responses (attempt_id, question_id, selected_answer, is_correct)
                VALUES (?, ?, ?, ?)
            `, [attemptId, questionId, selectedAnswer, isCorrect]);
        }
        
        // Calculate and store performance summary
        const [performanceResult] = await db.execute(`
            SELECT 
                COUNT(*) as total_questions,
                SUM(is_correct) as correct_answers,
                SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) * q.marks as total_marks,
                SUM(q.marks) as max_marks
            FROM student_responses sr
            JOIN questions q ON sr.question_id = q.question_id
            WHERE sr.attempt_id = ?
        `, [attemptId]);
        
        const performance = performanceResult[0];
        const percentage = performance.max_marks > 0 ? 
            (performance.total_marks / performance.max_marks) * 100 : 0;
        
        // Store performance summary
        await db.execute(`
            INSERT INTO performance_summary (student_id, exam_id, total_questions, correct_answers, average_score, percentage)
            VALUES (?, ?, ?, ?, ?)
        `, [
            student_id,
            exam_id,
            performance.total_questions,
            performance.correct_answers,
            percentage
        ]);
        
        // Commit transaction
        await db.execute('COMMIT');
        
        res.json({
            success: true,
            attempt_id: attemptId,
            performance: {
                total_questions: performance.total_questions,
                correct_answers: performance.correct_answers,
                total_marks: performance.total_marks,
                max_marks: performance.max_marks,
                percentage: percentage.toFixed(2)
            }
        });
        
    } catch (error) {
        // Rollback on error
        await db.execute('ROLLBACK');
        console.error('Error submitting exam attempt:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get exam attempt results
router.get('/:attemptId', async (req, res) => {
    const attemptId = req.params.attemptId;
    
    try {
        // Get attempt details
        const [attempt] = await db.execute(`
            SELECT ea.*, s.student_name, e.exam_name, e.exam_type
            FROM exam_attempts ea
            JOIN students s ON ea.student_id = s.student_id
            JOIN exams e ON ea.exam_id = e.exam_id
            WHERE ea.attempt_id = ?
        `, [attemptId]);
        
        if (attempt.length === 0) {
            return res.status(404).json({ error: 'Attempt not found' });
        }
        
        // Get detailed responses
        const [responses] = await db.execute(`
            SELECT 
                sr.question_id,
                sr.selected_answer,
                sr.is_correct,
                q.question_text,
                qo.option_text as correct_option_text,
                q.marks,
                q.explanation_text
            FROM student_responses sr
            JOIN questions q ON sr.question_id = q.question_id
            LEFT JOIN question_options qo ON sr.question_id = qo.question_id AND qo.is_correct = 1
            WHERE sr.attempt_id = ?
            ORDER BY sr.question_id
        `, [attemptId]);
        
        // Get performance summary
        const [performance] = await db.execute(`
            SELECT * FROM performance_summary 
            WHERE attempt_id = ?
        `, [attemptId]);
        
        res.json({
            attempt: attempt[0],
            responses: responses,
            performance: performance[0] || null
        });
        
    } catch (error) {
        console.error('Error fetching attempt results:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get student's exam attempts
router.get('/student/:studentId', async (req, res) => {
    const studentId = req.params.studentId;
    
    try {
        const [attempts] = await db.execute(`
            SELECT 
                ea.*,
                e.exam_name,
                e.exam_type,
                ps.percentage,
                ps.correct_answers,
                ps.total_questions
            FROM exam_attempts ea
            JOIN exams e ON ea.exam_id = e.exam_id
            LEFT JOIN performance_summary ps ON ea.attempt_id = ps.attempt_id
            WHERE ea.student_id = ?
            ORDER BY ea.attempt_id DESC
        `, [studentId]);
        
        res.json(attempts);
        
    } catch (error) {
        console.error('Error fetching student attempts:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
