import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import styles from "../styles/Login.module.css";

export default function StudentDashboard() {
  const router = useRouter();
  const [studentData, setStudentData] = useState(null);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeMenu, setActiveMenu] = useState("dashboard");

  useEffect(() => {
    // Get student data from localStorage
    const student = JSON.parse(localStorage.getItem('student'));
    if (!student) {
      router.push('/student-login');
      return;
    }
    setStudentData(student);
    fetchExams(student.exam_type);
  }, []);

  const fetchExams = async (studentExamType) => {
    try {
      const res = await fetch('http://localhost:3001/api/exams');
      const allExams = await res.json();
      
      // Filter exams by student's exam type
      const filteredExams = allExams.filter(exam => exam.exam_type === studentExamType);
      setExams(filteredExams);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching exams:', err);
      setLoading(false);
    }
  };

  const handleExamClick = (examId) => {
    router.push(`/student-exam?examId=${examId}`);
  };

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      localStorage.removeItem('student');
      router.push('/');
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loginBox}>
          <h3>Loading...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* HEADER */}
      <div className={styles.header}>
        <h2>Vijeta Foundation - Student Portal</h2>
        <div className={styles.profile}>
          <span>{studentData?.student_name}</span>
          <button onClick={handleLogout} className={styles.button}>Logout</button>
        </div>
      </div>

      <div className={styles.main}>
        {/* SIDEBAR */}
        <div className={styles.sidebar}>
          <p className={activeMenu==="dashboard"?styles.active:""} onClick={()=>setActiveMenu("dashboard")}>Dashboard</p>
          <p className={activeMenu==="exams"?styles.active:""} onClick={()=>setActiveMenu("exams")}>My Exams</p>
          <p className={activeMenu==="results"?styles.active:""} onClick={()=>setActiveMenu("results")}>Results</p>
          <p className={activeMenu==="profile"?styles.active:""} onClick={()=>setActiveMenu("profile")}>Profile</p>
        </div>

        <div className={styles.content}>
          {/* DASHBOARD */}
          {activeMenu === "dashboard" && (
            <>
              <h2 style={{ textAlign: "center" }}>Welcome, {studentData?.student_name}!</h2>
              
              <div className={styles.card}>
                <h3>Your Exam Type: {studentData?.exam_type}</h3>
                <p>Available Exams: {exams.length}</p>
                <p>Batch: {studentData?.batch_name}</p>
                <p>Roll No: {studentData?.roll_no}</p>
              </div>

              <h3>Available {studentData?.exam_type} Exams</h3>
              <div className={styles.examGrid}>
                {exams.length > 0 ? exams.map((exam) => (
                  <div key={exam.exam_id} className={styles.examCard}>
                    <h4>{exam.exam_name}</h4>
                    <p><strong>Date:</strong> {exam.exam_date}</p>
                    <p><strong>Time:</strong> {exam.exam_time}</p>
                    <p><strong>Duration:</strong> {exam.duration_minutes} minutes</p>
                    <p><strong>Questions:</strong> {exam.total_questions}</p>
                    <p><strong>Status:</strong> <span className={styles.upcoming}>{exam.exam_status || 'Available'}</span></p>
                    <button 
                      className={styles.button}
                      onClick={() => handleExamClick(exam.exam_id)}
                    >
                      Start Exam
                    </button>
                  </div>
                )) : (
                  <p>No {studentData?.exam_type} exams available at the moment.</p>
                )}
              </div>
            </>
          )}

          {/* MY EXAMS */}
          {activeMenu === "exams" && (
            <>
              <h2 style={{ textAlign: "center" }}>My {studentData?.exam_type} Exams</h2>
              
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Exam Name</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Duration</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {exams.length > 0 ? exams.map((exam) => (
                    <tr key={exam.exam_id}>
                      <td>{exam.exam_name}</td>
                      <td>{exam.exam_date}</td>
                      <td>{exam.exam_time}</td>
                      <td>{exam.duration_minutes} min</td>
                      <td><span className={styles.upcoming}>{exam.exam_status || 'Available'}</span></td>
                      <td>
                        <button 
                          className={styles.button}
                          onClick={() => handleExamClick(exam.exam_id)}
                        >
                          Start
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="6">No exams available</td></tr>
                  )}
                </tbody>
              </table>
            </>
          )}

          {/* RESULTS */}
          {activeMenu === "results" && (
            <>
              <h2 style={{ textAlign: "center" }}>Exam Results</h2>
              
              <div className={styles.card}>
                <p>No results available yet. Complete exams to see your results here.</p>
              </div>
            </>
          )}

          {/* PROFILE */}
          {activeMenu === "profile" && (
            <>
              <h2 style={{ textAlign: "center" }}>Student Profile</h2>
              
              <div className={styles.card}>
                <h3>Personal Details</h3>
                <p><strong>Name:</strong> {studentData?.student_name}</p>
                <p><strong>Email:</strong> {studentData?.email}</p>
                <p><strong>Mobile:</strong> {studentData?.mobile_no}</p>
                <p><strong>Roll No:</strong> {studentData?.roll_no}</p>
                <p><strong>Batch:</strong> {studentData?.batch_name}</p>
                <p><strong>Exam Type:</strong> {studentData?.exam_type}</p>
                <p><strong>Admission Year:</strong> {studentData?.admission_year}</p>
                <p><strong>College:</strong> {studentData?.college_name}</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
