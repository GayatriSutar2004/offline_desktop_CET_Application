const express = require('express');
const router = express.Router();
const db = require('../db');

// Get exams available for student based on their exam type
router.get('/available/:studentId', async (req, res) => {
    const studentId = req.params.studentId;
    
    try {
        // Get student's exam type
        const [studentResult] = await db.execute(
            'SELECT exam_type FROM students WHERE student_id = ?',
            [studentId]
        );
        
        if (studentResult.length === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }
        
        const studentExamType = studentResult[0].exam_type;
        
        // Get exams matching student's exam type
        const [exams] = await db.execute(
            'SELECT * FROM exams WHERE exam_type = ? ORDER BY exam_date DESC',
            [studentExamType]
        );
        
        res.json({
            student_exam_type: studentExamType,
            available_exams: exams
        });
        
    } catch (error) {
        console.error('Error fetching available exams:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get exam questions with sections for eligible student
router.get('/:examId/questions/:studentId', async (req, res) => {
    const { examId, studentId } = req.params;
    
    try {
        // Verify student eligibility for this exam
        const eligibilityQuery = `
            SELECT s.exam_type as student_exam_type, e.exam_type as exam_type
            FROM students s
            JOIN exams e ON s.exam_type = e.exam_type
            WHERE s.student_id = ? AND e.exam_id = ?
        `;
        
        const [eligibilityResult] = await db.execute(eligibilityQuery, [studentId, examId]);
        
        if (eligibilityResult.length === 0) {
            return res.status(403).json({ 
                error: 'Access denied. You are not eligible for this exam.' 
            });
        }
        
        // Get exam details
        const [examDetails] = await db.execute(
            'SELECT * FROM exams WHERE exam_id = ?',
            [examId]
        );
        
        if (examDetails.length === 0) {
            return res.status(404).json({ error: 'Exam not found' });
        }
        
        // Get questions with options for this exam
        const [questions] = await db.execute(`
            SELECT 
                q.question_id,
                q.question_text,
                COALESCE(q.section_name, 'General') as section_name,
                q.marks,
                q.negative_marks,
                q.difficulty_level,
                q.explanation_text,
                GROUP_CONCAT(
                    CONCAT(qo.option_label, ') ', qo.option_text) 
                    ORDER BY qo.option_label
                    SEPARATOR '|'
                ) as options_text,
                GROUP_CONCAT(
                    CASE WHEN qo.is_correct = 1 THEN qo.option_label END
                ) as correct_answer
            FROM questions q
            INNER JOIN exam_questions eq ON q.question_id = eq.question_id
            INNER JOIN question_options qo ON q.question_id = qo.question_id
            WHERE eq.exam_id = ?
            GROUP BY q.question_id
            ORDER BY q.question_id
        `, [examId]);
        
        // Format questions with proper options array
        const formattedQuestions = questions.map(q => ({
            question_id: q.question_id,
            question_text: q.question_text,
            section_name: q.section_name || 'General',
            options: q.options_text ? q.options_text.split('|') : [],
            correct_answer: q.correct_answer || '',
            marks: q.marks,
            negative_marks: q.negative_marks,
            difficulty_level: q.difficulty_level,
            explanation: q.explanation_text
        }));
        
        // Get sections if available (from parsed data)
        const [sections] = await db.execute(`
            SELECT DISTINCT 
                COALESCE(section_name, 'General') as section_name
            FROM questions q
            INNER JOIN exam_questions eq ON q.question_id = eq.question_id
            WHERE eq.exam_id = ?
            ORDER BY section_name
        `, [examId]);
        
        // Group questions by sections
        const questionsBySection = {};
        formattedQuestions.forEach(question => {
            const section = question.section_name || 'General';
            if (!questionsBySection[section]) {
                questionsBySection[section] = [];
            }
            questionsBySection[section].push(question);
        });
        
        res.json({
            exam: examDetails[0],
            sections: sections.map(s => s.section_name),
            questions_by_section: questionsBySection,
            total_questions: formattedQuestions.length
        });
        
    } catch (error) {
        console.error('Error fetching exam questions:', error);
        res.status(500).json({ error: error.message });
    }
});

// Check student access eligibility
router.get('/:examId/check-access/:studentId', async (req, res) => {
    const { examId, studentId } = req.params;
    
    try {
        const [accessCheck] = await db.execute(`
            SELECT 
                s.student_id,
                s.student_name,
                s.exam_type as student_exam_type,
                e.exam_id,
                e.exam_name,
                e.exam_type,
                CASE WHEN s.exam_type = e.exam_type THEN 'ELIGIBLE' ELSE 'NOT_ELIGIBLE' END as access_status
            FROM students s
            CROSS JOIN exams e
            WHERE s.student_id = ? AND e.exam_id = ?
        `, [studentId, examId]);
        
        if (accessCheck.length === 0) {
            return res.status(404).json({ error: 'Student or exam not found' });
        }
        
        res.json(accessCheck[0]);
        
    } catch (error) {
        console.error('Error checking access:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
