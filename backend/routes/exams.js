const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const mammoth = require('mammoth');
const fs = require('fs');
const EnhancedQuestionParser = require('../enhanced-question-parser');

const upload = multer({ dest: 'uploads/' });

// Get all exams
router.get('/', async (req, res) => {
  try {
    const [results] = await db.execute("SELECT * FROM exams");
    res.json(results);
  } catch(err) {
    console.log("DB ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// Add new exam
router.post('/add', upload.single('file'), async (req, res) => {
  console.log("=== EXAM UPLOAD REQUEST RECEIVED ===");
  console.log("Request body:", req.body);
  console.log("Uploaded file:", req.file);
  
  const { exam_name, duration_minutes, total_questions, exam_type, exam_date, exam_time } = req.body;
  const file = req.file;

  console.log("Extracted values:", {
    exam_name,
    duration_minutes,
    total_questions,
    exam_type,
    fileName: file?.originalname,
    fileSize: file?.size,
    filePath: file?.path
  });

  if(!exam_name || !duration_minutes || !total_questions || !file) {
    console.log("Validation failed - missing required fields");
    return res.status(400).json({ message: "Please fill all required fields and upload a file" });
  }

  try {
    // Map exam_type to exam_type_id
    const examTypeMapping = {
      'NDA': 3,
      'NEET': 5,
      'JEE': 5,
      'SSB': 1,
      'SSC': 2,
      'Police': 4,
      'Other': 5
    };
    
    const examTypeId = examTypeMapping[exam_type] || 5; // Default to 'Other' if not found
    
    // First, insert the exam
    const [result] = await db.execute(
      `INSERT INTO exams (exam_name, duration_minutes, total_questions, exam_type_id, exam_type, exam_date, exam_time, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
      [exam_name, duration_minutes, total_questions, examTypeId, exam_type || 'NDA', exam_date || new Date().toISOString().split('T')[0], exam_time || '09:00:00', 1]
    );
    const examId = result.insertId;

    // Now parse the file based on extension
    const fileExtension = file.originalname.split('.').pop().toLowerCase();
    
    if (fileExtension === 'docx' || fileExtension === 'doc') {
      // Parse Word document with enhanced parser
      const parser = new EnhancedQuestionParser();
      const parsedData = await parser.parseWordDocument(file.path);
      await insertParsedQuestions(parsedData, examId, file.path, res);
    } else if (fileExtension === 'txt') {
      // Parse text file with enhanced parser
      const parser = new EnhancedQuestionParser();
      const text = fs.readFileSync(file.path, 'utf8');
      parser.parseDocumentContent(text);
      const parsedData = {
        sections: parser.sections,
        questions: parser.questions
      };
      await insertParsedQuestions(parsedData, examId, file.path, res);
    } else {
      return res.status(400).json({ error: "Unsupported file type. Please upload .docx, .doc, or .txt files." });
    }
  } catch (err) {
    console.log("DB ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

async function insertParsedQuestions(parsedData, examId, filePath, res) {
  try {
    console.log('=== INSERTING PARSED QUESTIONS ===');
    console.log('Sections:', parsedData.sections.length);
    console.log('Questions:', parsedData.questions.length);
    
    let insertedQuestions = 0;
    
    for (const question of parsedData.questions) {
      try {
        // Insert the question
        const [questionResult] = await db.execute(
          `INSERT INTO questions (exam_type_id, subject_id, question_text, marks, negative_marks, difficulty_level, explanation_text, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            1, // exam_type_id (will be updated later)
            1, // subject_id
            question.question_text,
            1.00, // marks
            0.00, // negative_marks
            'Medium', // difficulty_level
            question.explanation || null,
            1 // created_by
          ]
        );
        
        const questionId = questionResult.insertId;
        console.log('Inserted question ID:', questionId);
        
        // Insert options if they exist
        if (question.options && question.options.length > 0) {
          for (const option of question.options) {
            await db.execute(
              `INSERT INTO question_options (question_id, option_label, option_text, is_correct) VALUES (?, ?, ?, ?)`,
              [
                questionId,
                option.label,
                option.text,
                option.label === question.correct_answer ? 1 : 0
              ]
            );
          }
          console.log('Inserted', question.options.length, 'options for question', questionId);
        }
        
        insertedQuestions++;
      } catch (questionError) {
        console.error('Error inserting individual question:', questionError);
        // Continue with other questions
      }
    }
    
    // Link questions to exam using exam_questions table
    if (parsedData.questions.length > 0) {
      try {
        // Get the question IDs that were just inserted
        const [latestQuestions] = await db.execute(
          'SELECT question_id FROM questions ORDER BY question_id DESC LIMIT ?',
          [parsedData.questions.length]
        );
        
        // Link each question to the exam
        for (const question of latestQuestions) {
          await db.execute(
            'INSERT INTO exam_questions (exam_id, question_id) VALUES (?, ?)',
            [examId, question.question_id]
          );
        }
        
        console.log('Linked', latestQuestions.length, 'questions to exam', examId);
      } catch (linkError) {
        console.error('Error linking questions to exam:', linkError);
      }
    }
    
    // Delete the uploaded file
    fs.unlinkSync(filePath);
    
    res.json({ 
      message: `Exam created successfully with ${insertedQuestions} questions!`, 
      exam_id: examId,
      questions_inserted: insertedQuestions,
      sections_found: parsedData.sections.length
    });
    
  } catch (err) {
    console.log("Error inserting parsed questions:", err);
    res.status(500).json({ error: err.message });
  }
}

// Get individual exam
router.get('/:examId', async (req, res) => {
  const examId = req.params.examId;
  try {
    const [results] = await db.execute("SELECT * FROM exams WHERE exam_id = ?", [examId]);
    if (results.length === 0) {
      return res.status(404).json({ error: "Exam not found" });
    }
    res.json(results[0]);
  } catch(err) {
    console.log("DB ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get questions for an exam
router.get('/:examId/questions', async (req, res) => {
  const examId = req.params.examId;
  console.log("Fetching questions for exam_id:", examId);
  try {
    // Get questions linked to this specific exam
    const [examQuestions] = await db.execute(`
      SELECT q.* FROM questions q
      INNER JOIN exam_questions eq ON q.question_id = eq.question_id
      WHERE eq.exam_id = ?
      ORDER BY q.question_id
    `, [examId]);
    
    console.log("Found questions:", examQuestions.length);
    
    // Transform the data and fetch options for each question
    const transformedQuestions = [];
    
    for (const question of examQuestions) {
      // Get options for this question
      const [options] = await db.execute(`
        SELECT option_label, option_text, is_correct 
        FROM question_options 
        WHERE question_id = ?
        ORDER BY option_label
      `, [question.question_id]);
      
      // Format options as array of strings
      const formattedOptions = options.map(opt => `${opt.option_label}) ${opt.option_text}`);
      
      // Find correct answer index
      const correctAnswerIndex = options.findIndex(opt => opt.is_correct === 1);
      
      transformedQuestions.push({
        question_id: question.question_id,
        question_text: question.question_text,
        options: JSON.stringify(formattedOptions),
        correct_answer: correctAnswerIndex >= 0 ? correctAnswerIndex : 0,
        marks: question.marks,
        negative_marks: question.negative_marks,
        difficulty_level: question.difficulty_level,
        explanation: question.explanation_text
      });
    }
    
    console.log("Transformed questions with options:", transformedQuestions.length);
    res.json(transformedQuestions);
    
  } catch(err) {
    console.log("DB ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// Function to parse questions from Word document text
function parseQuestionsFromText(text) {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const questions = [];
  let currentQuestion = null;
  let options = [];
  let correctAnswer = null;
  
  for (let line of lines) {
    if (line.match(/^Question \d+:/i)) {
      // Save previous question if exists
      if (currentQuestion && options.length === 4 && correctAnswer !== null) {
        questions.push({
          question_text: currentQuestion,
          options: JSON.stringify(options),
          correct_answer: correctAnswer
        });
      }
      
      // Start new question
      currentQuestion = line.replace(/^Question \d+:\s*/i, '');
      options = [];
      correctAnswer = null;
    } else if (line.match(/^[A-D]\)/i)) {
      // Option line
      const optionText = line.replace(/^[A-D]\)\s*/i, '');
      options.push(optionText);
    } else if (line.match(/^Correct:/i)) {
      // Correct answer line
      const correctLetter = line.replace(/^Correct:\s*/i, '').toUpperCase();
      correctAnswer = ['A', 'B', 'C', 'D'].indexOf(correctLetter);
    }
  }
  
  // Save last question
  if (currentQuestion && options.length === 4 && correctAnswer !== null) {
    questions.push({
      question_text: currentQuestion,
      options: JSON.stringify(options),
      correct_answer: correctAnswer
    });
  }
  
  return questions;
}

module.exports = router;