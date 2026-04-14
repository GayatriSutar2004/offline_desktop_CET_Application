import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/Exam.module.css';

export default function StudentExam() {
    const router = useRouter();
    const [examData, setExamData] = useState(null);
    const [studentData, setStudentData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentSection, setCurrentSection] = useState(0);
    const [answers, setAnswers] = useState({});
    const [timeRemaining, setTimeRemaining] = useState(null);
    const [examStarted, setExamStarted] = useState(false);

    useEffect(() => {
        const studentData = localStorage.getItem('student');
        if (!studentData) {
            router.push('/student-login');
            return;
        }

        const student = JSON.parse(studentData);
        setStudentData(student);

        const { examId } = router.query;
        if (examId) {
            checkExamAccess(examId, student.student_id);
        }
    }, [router.query]);

    const checkExamAccess = async (examId, studentId) => {
        try {
            const response = await fetch(`http://localhost:3001/api/student-exams/${examId}/check-access/${studentId}`);
            const data = await response.json();

            if (response.status === 403) {
                setError(data.error);
                setLoading(false);
                return;
            }

            if (response.status === 404) {
                setError(data.error);
                setLoading(false);
                return;
            }

            if (data.access_status === 'ELIGIBLE') {
                loadExamQuestions(examId, studentId);
            } else {
                setError('You are not eligible for this exam. This exam is for ' + data.exam_type + ' students only.');
                setLoading(false);
            }
        } catch (err) {
            console.error('Error checking exam access:', err);
            setError('Error verifying exam access');
            setLoading(false);
        }
    };

    const loadExamQuestions = async (examId, studentId) => {
        try {
            const response = await fetch(`http://localhost:3001/api/student-exams/${examId}/questions/${studentId}`);
            const data = await response.json();

            if (response.ok) {
                setExamData(data);
                initializeTimer(data.exam.duration_minutes);
                setLoading(false);
            } else {
                setError(data.error || 'Error loading exam questions');
                setLoading(false);
            }
        } catch (err) {
            console.error('Error loading exam questions:', err);
            setError('Error loading exam questions');
            setLoading(false);
        }
    };

    const initializeTimer = (durationMinutes) => {
        const totalSeconds = durationMinutes * 60;
        setTimeRemaining(totalSeconds);
        setExamStarted(true);

        const timer = setInterval(() => {
            setTimeRemaining((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    submitExam();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const formatTime = (seconds) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleAnswerChange = (questionId, optionLabel) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: optionLabel
        }));
    };

    const startExam = () => {
        setExamStarted(true);
    };

    const submitExam = async () => {
        try {
            const response = await fetch('http://localhost:3001/api/exam-attempts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    student_id: studentData.student_id,
                    exam_id: examData.exam.exam_id,
                    answers: answers,
                    time_taken: (examData.exam.duration_minutes * 60) - timeRemaining
                })
            });

            const result = await response.json();
            if (response.ok) {
                // Redirect to immediate results page
                router.push(`/exam-result?attemptId=${result.attempt_id}`);
            } else {
                setError('Error submitting exam');
            }
        } catch (err) {
            console.error('Error submitting exam:', err);
            setError('Error submitting exam');
        }
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.examContainer}>
                    <h3>Loading exam...</h3>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.container}>
                <div className={styles.examContainer}>
                    <div className={styles.errorBox}>
                        <h3>Access Denied</h3>
                        <p>{error}</p>
                        <button 
                            className={styles.button}
                            onClick={() => router.push('/student-dashboard')}
                        >
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!examStarted) {
        return (
            <div className={styles.container}>
                <div className={styles.examContainer}>
                    <div className={styles.examHeader}>
                        <h2>{examData.exam.exam_name}</h2>
                        <p><strong>Exam Type:</strong> {examData.exam.exam_type}</p>
                        <p><strong>Total Questions:</strong> {examData.total_questions}</p>
                        <p><strong>Duration:</strong> {examData.exam.duration_minutes} minutes</p>
                        <p><strong>Marks:</strong> Each question carries {examData.exam.total_questions > 0 ? 
                            (examData.questions_by_section[Object.keys(examData.questions_by_section)[0]][0]?.marks || 1) : 1} marks</p>
                    </div>
                    
                    <div className={styles.instructions}>
                        <h3>Exam Instructions</h3>
                        <ul>
                            <li>This exam contains {examData.total_questions} questions</li>
                            <li>Each question has multiple choice options</li>
                            <li>Select only one answer for each question</li>
                            <li>You have {examData.exam.duration_minutes} minutes to complete the exam</li>
                            <li>Timer will start automatically when you begin</li>
                            <li>Exam will be submitted automatically when time expires</li>
                        </ul>
                    </div>

                    <button 
                        className={`${styles.button} ${styles.startButton}`}
                        onClick={startExam}
                    >
                        Start Exam
                    </button>
                </div>
            </div>
        );
    }

    const sections = examData.sections || [];
    const questionsBySection = examData.questions_by_section || {};

    return (
        <div className={styles.container}>
            <div className={styles.examContainer}>
                {/* Exam Header */}
                <div className={styles.examHeader}>
                    <div className={styles.examInfo}>
                        <h2>{examData.exam.exam_name}</h2>
                        <p><strong>Student:</strong> {studentData.student_name}</p>
                        <p><strong>Exam Type:</strong> {examData.exam.exam_type}</p>
                    </div>
                    <div className={styles.timer}>
                        <div className={styles.timeDisplay}>
                            {formatTime(timeRemaining)}
                        </div>
                        <p>Time Remaining</p>
                    </div>
                </div>

                {/* Section Navigation */}
                <div className={styles.sectionNav}>
                    <h3>Sections</h3>
                    <div className={styles.sectionTabs}>
                        {sections.map((section, index) => (
                            <button
                                key={index}
                                className={`${styles.sectionTab} ${currentSection === index ? styles.activeTab : ''}`}
                                onClick={() => setCurrentSection(index)}
                            >
                                {section}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Questions Display */}
                <div className={styles.questionsContainer}>
                    {sections.map((sectionName, sectionIndex) => (
                        <div 
                            key={sectionIndex}
                            className={`${styles.section} ${currentSection === sectionIndex ? styles.activeSection : styles.hiddenSection}`}
                        >
                            <h3 className={styles.sectionTitle}>{sectionName}</h3>
                            
                            {(questionsBySection[sectionName] || []).map((question, questionIndex) => (
                                <div key={question.question_id} className={styles.questionCard}>
                                    <div className={styles.questionHeader}>
                                        <span className={styles.questionNumber}>
                                            Q{questionIndex + 1}
                                        </span>
                                        <span className={styles.marks}>
                                            ({question.marks} marks)
                                        </span>
                                    </div>
                                    
                                    <div className={styles.questionText}>
                                        {question.question_text}
                                    </div>
                                    
                                    <div className={styles.optionsContainer}>
                                        {question.options.map((option, optionIndex) => (
                                            <label 
                                                key={optionIndex}
                                                className={styles.optionLabel}
                                            >
                                                <input
                                                    type="radio"
                                                    name={`question_${question.question_id}`}
                                                    value={option}
                                                    checked={answers[question.question_id] === option}
                                                    onChange={() => handleAnswerChange(question.question_id, option)}
                                                    className={styles.optionInput}
                                                />
                                                <span className={styles.optionText}>{option}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>

                {/* Submit Button */}
                <div className={styles.submitContainer}>
                    <button 
                        className={`${styles.button} ${styles.submitButton}`}
                        onClick={submitExam}
                    >
                        Submit Exam
                    </button>
                </div>
            </div>
        </div>
    );
}
