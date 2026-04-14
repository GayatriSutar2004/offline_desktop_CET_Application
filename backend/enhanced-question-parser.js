const mammoth = require('mammoth');

class EnhancedQuestionParser {
    constructor() {
        this.sections = [];
        this.currentSection = null;
        this.currentQuestion = null;
        this.questions = [];
    }

    async parseWordDocument(filePath) {
        try {
            console.log('=== ENHANCED WORD DOCUMENT PARSING STARTED ===');
            
            // Extract text from Word document
            const result = await mammoth.extractRawText({ path: filePath });
            const text = result.value;
            
            console.log('Document text length:', text.length);
            console.log('First 200 characters:', text.substring(0, 200));
            
            // Parse the text for questions, options, and answers
            this.parseDocumentContent(text);
            
            console.log('=== PARSING RESULTS ===');
            console.log('Sections found:', this.sections.length);
            console.log('Total questions extracted:', this.questions.length);
            
            return {
                sections: this.sections,
                questions: this.questions
            };
            
        } catch (error) {
            console.error('Error parsing Word document:', error);
            throw error;
        }
    }

    parseDocumentContent(text) {
        const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Detect section headers
            if (this.isSectionHeader(line)) {
                this.startNewSection(line);
            }
            // Detect question numbers
            else if (this.isQuestionStart(line)) {
                this.startNewQuestion(line);
            }
            // Detect options
            else if (this.isOption(line)) {
                this.addOption(line);
            }
            // Detect correct answers
            else if (this.isCorrectAnswer(line)) {
                this.setCorrectAnswer(line);
            }
            // Detect explanations
            else if (this.isExplanation(line)) {
                this.addExplanation(line);
            }
            // Add content to current question
            else if (this.currentQuestion) {
                this.addQuestionContent(line);
            }
        }
        
        // Finalize the last question
        this.finalizeCurrentQuestion();
    }

    isSectionHeader(line) {
        const sectionPatterns = [
            /^Section\s+\d+/i,
            /^Part\s+\d+/i,
            /^[A-Z]+\s+SECTION/i,
            /^UNIT\s+\d+/i,
            /^CHAPTER\s+\d+/i,
            /^\d+\.\s*[A-Z]+/i,
            /^[A-Z]+\s*\d+/i
        ];
        
        // Check if it's a section header AND not a question
        return sectionPatterns.some(pattern => pattern.test(line)) && !line.match(/^Question\s*\d+/i);
    }

    isQuestionStart(line) {
        const questionPatterns = [
            /^Q\s*\d+/i,
            /^Question\s*\d+/i,
            /^\d+\.\s*/i,
            /^\d+\)\s*/i,
            /^(\d+)\./i,
            /^(\d+)[\.\)]/i
        ];
        
        return questionPatterns.some(pattern => pattern.test(line)) && !this.isSectionHeader(line);
    }

    isOption(line) {
        const optionPatterns = [
            /^[A-D]\)\s*/i,
            /^[A-D]\.\s*/i,
            /^\([A-D]\)\s*/i,
            /^\([A-D]\)\s*/i,
            /^[a-d]\)\s*/i,
            /^[a-d]\.\s*/i,
            /^Option\s*[A-D]/i,
            /^Ans\s*[A-D]/i
        ];
        
        return optionPatterns.some(pattern => pattern.test(line));
    }

    isCorrectAnswer(line) {
        const answerPatterns = [
            /^Correct\s*[:\-]/i,
            /^Answer\s*[:\-]/i,
            /^Ans\s*[:\-]/i,
            /^Solution\s*[:\-]/i,
            /^[A-D]\s*is\s*correct/i,
            /^The\s*correct\s*answer\s*is/i
        ];
        
        return answerPatterns.some(pattern => pattern.test(line));
    }

    isExplanation(line) {
        const explanationPatterns = [
            /^Explanation\s*[:\-]/i,
            /^Reason\s*[:\-]/i,
            /^Solution\s*[:\-]/i,
            /^Note\s*[:\-]/i,
            /^Hint\s*[:\-]/i
        ];
        
        return explanationPatterns.some(pattern => pattern.test(line));
    }

    startNewSection(line) {
        // Finalize current question before starting new section
        this.finalizeCurrentQuestion();
        
        this.currentSection = {
            name: line,
            questions: []
        };
        
        this.sections.push(this.currentSection);
        console.log('Started new section:', line);
    }

    startNewQuestion(line) {
        // Finalize previous question
        this.finalizeCurrentQuestion();
        
        this.currentQuestion = {
            question_text: line,
            options: [],
            correct_answer: null,
            explanation: null,
            section: this.currentSection ? this.currentSection.name : 'General'
        };
        
        console.log('Started new question:', line.substring(0, 50));
    }

    addOption(line) {
        if (!this.currentQuestion) return;
        
        // Clean the option text
        const cleanOption = line.replace(/^[A-D\.\)\(\s]+/i, '').trim();
        
        // Extract option letter
        const optionLetter = line.match(/^[A-D]/i)?.[0].toUpperCase();
        
        this.currentQuestion.options.push({
            label: optionLetter,
            text: cleanOption
        });
        
        console.log('Added option:', optionLetter, '-', cleanOption.substring(0, 30));
    }

    setCorrectAnswer(line) {
        if (!this.currentQuestion) return;
        
        // Extract the correct answer letter - handle "Correct: A" format
        const match = line.match(/Correct\s*[:\-]\s*([A-D])/i);
        if (match) {
            const correctLetter = match[1].toUpperCase();
            this.currentQuestion.correct_answer = correctLetter;
            console.log('Set correct answer:', correctLetter);
        } else {
            // Fallback to any A-D in the line
            const fallbackMatch = line.match(/[A-D]/i);
            if (fallbackMatch) {
                const correctLetter = fallbackMatch[0].toUpperCase();
                this.currentQuestion.correct_answer = correctLetter;
                console.log('Set correct answer (fallback):', correctLetter);
            }
        }
    }

    addExplanation(line) {
        if (!this.currentQuestion) return;
        
        const cleanExplanation = line.replace(/^(Explanation|Reason|Solution|Note|Hint)\s*[:\-]\s*/i, '').trim();
        this.currentQuestion.explanation = cleanExplanation;
        console.log('Added explanation:', cleanExplanation.substring(0, 50));
    }

    addQuestionContent(line) {
        if (!this.currentQuestion) return;
        
        // Add additional content to the question text
        this.currentQuestion.question_text += ' ' + line;
    }

    finalizeCurrentQuestion() {
        if (this.currentQuestion && this.currentQuestion.options.length > 0) {
            // Add question to current section
            if (this.currentSection) {
                this.currentSection.questions.push(this.currentQuestion);
            }
            
            // Add to global questions array
            this.questions.push(this.currentQuestion);
            
            console.log('Finalized question with', this.currentQuestion.options.length, 'options');
            
            this.currentQuestion = null;
        }
    }

    // Alternative parsing method for different document formats
    parseAlternativeFormat(text) {
        const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        const questions = [];
        
        let currentQuestion = null;
        let questionNumber = 0;
        
        for (const line of lines) {
            // Look for numbered questions
            const questionMatch = line.match(/^(\d+)[\.\)]\s*(.+)/);
            if (questionMatch) {
                // Save previous question
                if (currentQuestion) {
                    questions.push(currentQuestion);
                }
                
                // Start new question
                questionNumber++;
                currentQuestion = {
                    question_number: questionNumber,
                    question_text: questionMatch[2],
                    options: [],
                    correct_answer: null,
                    explanation: null
                };
            }
            // Look for options
            else if (currentQuestion && line.match(/^[A-D][\.\)]/i)) {
                const optionMatch = line.match(/^([A-D])[\.\)]\s*(.+)/);
                if (optionMatch) {
                    currentQuestion.options.push({
                        label: optionMatch[1].toUpperCase(),
                        text: optionMatch[2]
                    });
                }
            }
            // Look for correct answer
            else if (currentQuestion && line.match(/correct|answer/i)) {
                const answerMatch = line.match(/([A-D])/i);
                if (answerMatch) {
                    currentQuestion.correct_answer = answerMatch[1].toUpperCase();
                }
            }
        }
        
        // Save last question
        if (currentQuestion) {
            questions.push(currentQuestion);
        }
        
        return questions;
    }
}

module.exports = EnhancedQuestionParser;
