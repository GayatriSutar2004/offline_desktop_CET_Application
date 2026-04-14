
import React, { useState, useEffect } from "react";
import styles from "../styles/Admin.module.css";

export default function AdminDashboard() {
  const [activeMenu, setActiveMenu] = useState("create");
  const [editMode, setEditMode] = useState(false);
  const [createView, setCreateView] = useState("exam");

  const [profileView, setProfileView] = useState("view");
  const [adminData, setAdminData] = useState(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editMobile, setEditMobile] = useState("");

  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");

  const [students, setStudents] = useState([]); // FIX: added missing state
  const [editStudent, setEditStudent] = useState(null);
  const [exams, setExams] = useState([]); // Add exams state
  const [results, setResults] = useState([]); // Add results state

  const [examName, setExamName] = useState("");
  const [hour, setHour] = useState("");
  const [minute, setMinute] = useState("");
  const [date, setDate] = useState("");

  // Fetch admin data
  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const res = await fetch("http://localhost:3001/api/admin/");
        const data = await res.json();
        if (data.length > 0) {
          setAdminData(data[0]);
          setEditName(data[0].admin_name);
          setEditEmail(data[0].email);
          setEditMobile(data[0].mobile_no);
        }
      } catch (err) {
        console.log(err);
      }
    };
    fetchAdminData();
  }, []);

  // Update admin profile
  const updateAdminProfile = async () => {
    if(!editName || !editEmail || !editMobile){
      alert("Please fill all fields!");
      return;
    }

    try {
      const res = await fetch(`http://localhost:3001/api/admin/update/${adminData.admin_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          admin_name: editName,
          email: editEmail,
          mobile_no: editMobile
        })
      });

      const data = await res.json();
      alert(data.message);
      if (res.ok) {
        // Refresh admin data
        const adminRes = await fetch("http://localhost:3001/api/admin/");
        const adminData = await adminRes.json();
        if (adminData.length > 0) {
          setAdminData(adminData[0]);
        }
        setProfileView("view");
      }
    } catch (err) {
      console.log(err);
      alert("Error updating profile");
    }
  };

  // Change admin password
  const changePassword = async () => {
    if(!oldPass || !newPass || !confirmPass){
      alert("Please fill all fields!");
      return;
    }

    if(newPass !== confirmPass){
      alert("Password does not match!");
      return;
    }

    try {
      const res = await fetch(`http://localhost:3001/api/admin/password/${adminData.admin_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oldPassword: oldPass,
          newPassword: newPass
        })
      });

      const data = await res.json();
      alert(data.message);
      if (res.ok) {
        setOldPass("");
        setNewPass("");
        setConfirmPass("");
        setProfileView("view");
      }
    } catch (err) {
      console.log(err);
      alert("Error changing password");
    }
  };

  // Logout function
  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      window.location.href = "/";
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/students/with-results");
      const data = await res.json();
      setStudents(data);
    } catch (err) {
      console.log(err);
      alert("Error fetching students");
    }
  };

  const fetchExams = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/exams");
      const data = await res.json();
      setExams(data);
    } catch (err) {
      console.log(err);
      alert("Error fetching exams");
    }
  };

  const fetchResults = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/admin-results");
      const data = await res.json();
      setResults(data);
    } catch (err) {
      console.log(err);
      alert("Error fetching results");
    }
  };

  const fetchResultsByExamType = async (examType) => {
    try {
      const url = examType === 'all' 
        ? "http://localhost:3001/api/admin-results"
        : `http://localhost:3001/api/admin-results/by-exam-type/${examType}`;
      
      const res = await fetch(url);
      const data = await res.json();
      setResults(data);
    } catch (err) {
      console.log(err);
      alert("Error fetching results");
    }
  };

  const viewResultDetails = async (attemptId) => {
    try {
      const res = await fetch(`http://localhost:3001/api/admin-results/${attemptId}`);
      const data = await res.json();
      
      // Create a modal or detailed view
      alert(`Attempt ID: ${attemptId}\nStudent: ${data.result?.student_name}\nExam: ${data.result?.exam_name}\nPercentage: ${data.result?.percentage}%\n\nDetailed responses available in console.`);
      console.log('Result details:', data);
    } catch (err) {
      console.error('Error fetching result details:', err);
      alert('Error fetching result details');
    }
  };

  const deleteResult = async (attemptId) => {
    if (!window.confirm("Are you sure you want to delete this result? This action cannot be undone.")) {
      return;
    }
    
    try {
      const res = await fetch(`http://localhost:3001/api/admin-results/${attemptId}`, {
        method: "DELETE"
      });
      
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        fetchResults(); // Refresh the results list
      } else {
        alert(data.error || 'Error deleting result');
      }
    } catch (err) {
      console.error('Error deleting result:', err);
      alert('Error deleting result');
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchExams();
    fetchResults();
  }, []);

  const deleteStudent = async (id) => {
    if (!window.confirm("Delete this student?")) return;

    try {
      const res = await fetch(`http://localhost:3001/api/students/delete/${id}`, {
        method: "DELETE"
      });

      const data = await res.json();
      alert(data.message);
      fetchStudents();
    } catch (err) {
      console.log(err);
      alert("Error deleting student");
    }
  };

  const updateStudent = async () => {
    // FIX: ensure all required fields exist
    const { student_name, batch_name, mobile_no, email } = editStudent;
    if(!student_name || !batch_name || !mobile_no || !email){
      alert("All fields required!");
      return;
    }

    try {
      const res = await fetch(`http://localhost:3001/api/students/update/${editStudent.student_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editStudent)
      });

      const data = await res.json();
      alert(data.message);
      setEditStudent(null);
      fetchStudents();
    } catch (err) {
      console.log(err);
      alert("Error updating student");
    }
  };

  // ================= ADD STUDENT =================
  const [sName, setSName] = useState("");
  const [sBatch, setSBatch] = useState("");
  const [sYear, setSYear] = useState("");
  const [sRoll, setSRoll] = useState("");
  const [sMobile, setSMobile] = useState("");
  const [sEmail, setSEmail] = useState("");
  const [sPassword, setSPassword] = useState("");
  const [sConfirmPassword, setSConfirmPassword] = useState("");
  const [sExamType, setSExamType] = useState("NDA");

  const addStudent = async () => {
    if(!sName || !sBatch || !sYear || !sRoll || !sMobile || !sEmail || !sPassword){
      alert("Please fill all required fields");
      return;
    }

    if(sPassword !== sConfirmPassword){
      alert("Passwords do not match");
      return;
    }

    try {
      const res = await fetch("http://localhost:3001/api/students/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_name: sName,
          batch_name: sBatch,
          admission_year: sYear,
          roll_no: sRoll,
          mobile_no: sMobile,
          email: sEmail,
          password_hash: sPassword,
          exam_type: sExamType,
          city: "Ashta",
          state: "MH",
          college_name: "ADCET"
        })
      });

      const data = await res.json();
      alert(data.message);
      // Reset form
      setSName(""); setSBatch(""); setSYear(""); setSRoll("");
      setSMobile(""); setSEmail(""); setSPassword(""); setSConfirmPassword("");
      fetchStudents();
    } catch (err) {
      console.log(err);
      alert("Error adding student");
    }
  };

  // ================= EXAM =================
  const [cExamName, setCExamName] = useState("");
  const [cHour, setCHour] = useState("");
  const [cMinute, setCMinute] = useState("");
  const [cQuestions, setCQuestions] = useState("");
  const [cExamType, setCExamType] = useState("");
  const [cExamDate, setCExamDate] = useState("");
  const [cExamTime, setCExamTime] = useState("09:00");
  const [cTimePeriod, setTimePeriod] = useState("AM");
  const [cFile, setCFile] = useState(null);

  const createExam = async () => {
    console.log("=== EXAM CREATION STARTED ===");
    console.log("Exam creation values:", {
      cExamName,
      cHour,
      cMinute,
      cQuestions,
      cExamType,
      cFile,
      cFileName: cFile?.name,
      cFileSize: cFile?.size,
      cFileType: cFile?.type
    });

    // Validation with detailed logging
    if(!cExamName || cExamName.trim() === ""){
      console.log("Validation failed: Missing exam name");
      alert("Please enter exam name!");
      return;
    }
    if(!cHour || cHour.trim() === ""){
      console.log("Validation failed: Missing hours");
      alert("Please enter hours!");
      return;
    }
    if(!cMinute || cMinute.trim() === ""){
      console.log("Validation failed: Missing minutes");
      alert("Please enter minutes!");
      return;
    }
    if(!cQuestions || cQuestions.trim() === ""){
      console.log("Validation failed: Missing total questions");
      alert("Please enter total questions!");
      return;
    }
    if(!cExamType || cExamType.trim() === ""){
      console.log("Validation failed: Missing exam type");
      alert("Please select exam type!");
      return;
    }
    if(!cFile){
      console.log("Validation failed: Missing file");
      alert("Please select a file!");
      return;
    }

    console.log("Validation passed, creating FormData...");
    const formData = new FormData();
    
    try {
      formData.append('exam_name', cExamName);
      formData.append('duration_minutes', parseInt(cHour)*60 + parseInt(cMinute));
      formData.append('total_questions', cQuestions);
      formData.append('exam_type', cExamType);
      formData.append('exam_date', cExamDate);
      // Convert 12-hour format to 24-hour format for MySQL
      let time24Hour = cExamTime;
      if (cTimePeriod === 'PM' && cExamTime !== '12:00') {
        const [hours, minutes] = cExamTime.split(':');
        time24Hour = `${parseInt(hours) + 12}:${minutes}`;
      } else if (cTimePeriod === 'AM' && cExamTime === '12:00') {
        time24Hour = '00:00';
      }
      formData.append('exam_time', time24Hour);
      formData.append('file', cFile);
      
      console.log("FormData created successfully");
      console.log("FormData contents:");
      for (let [key, value] of formData.entries()) {
        console.log(`${key}:`, value instanceof File ? `${value.name} (${value.size} bytes)` : value);
      }
    } catch (formError) {
      console.error("Error creating FormData:", formError);
      alert("Error creating form data: " + formError.message);
      return;
    }

    try {
      console.log("Starting API call to http://localhost:3001/api/exams/add");
      console.log("Request method: POST");
      console.log("Request body type: FormData");
      
      const res = await fetch("http://localhost:3001/api/exams/add", {
        method: "POST",
        body: formData,
        // Don't set Content-Type header when using FormData - browser sets it automatically with boundary
      });

      console.log("Response received:");
      console.log("Response status:", res.status);
      console.log("Response ok:", res.ok);
      console.log("Response headers:", Object.fromEntries(res.headers.entries()));

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Response error text:", errorText);
        throw new Error(`HTTP ${res.status}: ${errorText}`);
      }

      const data = await res.json();
      console.log("Response data:", data);
      
      if (data.message) {
        alert(data.message);
      } else {
        alert("Exam created successfully!");
      }
      
      // Reset form
      setCExamName(""); setCHour(""); setCMinute(""); setCQuestions(""); setCExamType(""); setCFile(null);
      console.log("Form reset completed");
      // Refresh exams list
      fetchExams();
      
    } catch (err) {
      console.error("=== UPLOAD ERROR ===");
      console.error("Error type:", err.constructor.name);
      console.error("Error message:", err.message);
      console.error("Error stack:", err.stack);
      
      // More detailed error message
      let errorMessage = "Error creating exam: ";
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        errorMessage += "Network error - unable to connect to server. Please check if backend is running.";
      } else if (err.message.includes('HTTP')) {
        errorMessage += "Server error: " + err.message;
      } else {
        errorMessage += err.message;
      }
      
      alert(errorMessage);
    }
  };

  return (
    <div className={styles.container}>
      {/* HEADER */}
      <div className={styles.header}>
        <h2>Vijeta Foundation</h2>
        <div className={styles.profile}></div>
      </div>

      <div className={styles.main}>
        {/* SIDEBAR */}
        <div className={styles.sidebar}>
          <p className={activeMenu==="create"?styles.active:""} onClick={()=>{setActiveMenu("create");setEditMode(false);}}>Create</p>
          <p className={activeMenu==="students"?styles.active:""} onClick={()=>setActiveMenu("students")}>Students</p>
          <p className={activeMenu==="result"?styles.active:""} onClick={()=>{setActiveMenu("result");setEditMode(false);}}>Result</p>
          <p className={activeMenu==="settings"?styles.active:""} onClick={()=>{setActiveMenu("settings");setEditMode(false);}}>Settings</p>
          <p className={activeMenu==="profile"?styles.active:""} onClick={()=>{setActiveMenu("profile");setEditMode(false);}}>Profile</p>
        </div>

        <div className={styles.content}>

          {/* CREATE */}
          {activeMenu === "create" && (
            <>
              <h2 style={{ textAlign: "center" }}>Welcome Admin..!</h2>

              <div className={styles.tabs}>
                <button onClick={()=>setCreateView("exam")}>Create Exam</button>
                <button onClick={()=>setCreateView("student")}>Add Student</button>
              </div>

              {/* CREATE EXAM */}
              {createView === "exam" && (
                <div className={styles.card}>
                  <h3 style={{ textAlign: "center" }}>Add Exam</h3>

                  <input value={cExamName} onChange={(e)=>setCExamName(e.target.value)} placeholder="Exam Name"/>

                  <div className={styles.row}>
                    <input 
                      type="date" 
                      value={cExamDate} 
                      onChange={(e)=>setCExamDate(e.target.value)} 
                      placeholder="Exam Date"
                    />
                    <input 
                      type="time" 
                      value={cExamTime} 
                      onChange={(e)=>setCExamTime(e.target.value)} 
                      placeholder="Exam Time"
                    />
                    <select value={cTimePeriod} onChange={(e)=>setTimePeriod(e.target.value)}>
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>

                  <div className={styles.row}>
                    <input value={cHour} onChange={(e)=>setCHour(e.target.value)} placeholder="Exam Duration (Hours)"/>
                    <input value={cMinute} onChange={(e)=>setCMinute(e.target.value)} placeholder="Exam Duration (Minutes)"/>
                    <select onChange={(e)=>setCExamType(e.target.value)}>
                      <option value="">Select Type</option>
                      <option value="NDA">NDA</option>
                      <option value="NEET">NEET</option>
                      <option value="JEE">JEE</option>
                      <option value="SSB">SSB</option>
                      <option value="SSC">SSC</option>
                      <option value="Police">Police</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <input value={cQuestions} onChange={(e)=>setCQuestions(e.target.value)} placeholder="Total Questions"/>

                  <input 
                    type="file" 
                    accept=".docx,.doc,.txt" 
                    onChange={(e)=>{
                      console.log("File selected:", e.target.files[0]);
                      setCFile(e.target.files[0]);
                    }}
                  />
                  {cFile && <p style={{color: "green", fontWeight: "bold"}}>Selected: {cFile.name}</p>}

                  <button 
                    className={styles.btn} 
                    onClick={createExam}
                    disabled={!cExamName || !cHour || !cMinute || !cQuestions || !cExamType || !cFile}
                    style={{
                      backgroundColor: (!cExamName || !cHour || !cMinute || !cQuestions || !cExamType || !cFile) ? "#ccc" : "",
                      cursor: (!cExamName || !cHour || !cMinute || !cQuestions || !cExamType || !cFile) ? "not-allowed" : "pointer"
                    }}
                  >
                    Upload Test Document (.docx)
                  </button>
                </div>
              )}

              {/* ADD STUDENT */}
              {createView === "student" && (
                <div className={styles.card}>
                  <h3>Add Student</h3>

                  <input value={sName} onChange={(e)=>setSName(e.target.value)} placeholder="Student Name"/>
                  <input value={sBatch} onChange={(e)=>setSBatch(e.target.value)} placeholder="Batch"/>
                  <input value={sYear} onChange={(e)=>setSYear(e.target.value)} placeholder="Admission Year"/>
                  <input value={sRoll} onChange={(e)=>setSRoll(e.target.value)} placeholder="Roll No"/>
                  <input value={sMobile} onChange={(e)=>setSMobile(e.target.value)} placeholder="Mobile"/>
                  <input value={sEmail} onChange={(e)=>setSEmail(e.target.value)} placeholder="Email"/>
                  <select value={sExamType} onChange={(e)=>setSExamType(e.target.value)}>
                    <option value="">Select Exam Type</option>
                    <option value="NDA">NDA</option>
                    <option value="NEET">NEET</option>
                    <option value="JEE">JEE</option>
                    <option value="SSB">SSB</option>
                    <option value="SSC">SSC</option>
                    <option value="Police">Police</option>
                    <option value="Other">Other</option>
                  </select>
                  <input type="password" value={sPassword} onChange={(e)=>setSPassword(e.target.value)} placeholder="Password"/>
                  <input type="password" value={sConfirmPassword} onChange={(e)=>setSConfirmPassword(e.target.value)} placeholder="Confirm Password"/>

                  <button className={styles.btn} onClick={addStudent}>
                    Add Student
                  </button>
                </div>
              )}
            </>
          )}

          {/* STUDENTS */}
          {activeMenu === "students" && (
            <>
              <h2>Student Management - Comprehensive View</h2>

              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Roll No</th>
                    <th>Batch</th>
                    <th>Exam Type</th>
                    <th>Mobile</th>
                    <th>Exams Attempted</th>
                    <th>Average Score</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {students.length > 0 ? students.map((s)=>(
                    <tr key={s.student_id}>
                      <td>{s.student_name}</td>
                      <td>{s.email}</td>
                      <td>{s.roll_no}</td>
                      <td>{s.batch_name}</td>
                      <td>{s.exam_type}</td>
                      <td>{s.mobile_no}</td>
                      <td>{s.performance_summary?.exams_attempted || 0}</td>
                      <td>{s.performance_summary?.average_score ? `${parseFloat(s.performance_summary.average_score).toFixed(1)}%` : 'N/A'}</td>
                      <td>
                        <button onClick={()=>setEditStudent(s)}>Edit</button>
                        <button onClick={()=>deleteStudent(s.student_id)}>Delete</button>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="9">No students found</td></tr>
                  )}
                </tbody>
              </table>

              {editStudent && (
                <div className={styles.card}>
                  <h3>Edit Student</h3>

                  <input value={editStudent.student_name}
                    onChange={(e)=>setEditStudent({...editStudent, student_name:e.target.value})}
                    placeholder="Name"
                  />

                  <input value={editStudent.email}
                    onChange={(e)=>setEditStudent({...editStudent, email:e.target.value})}
                    placeholder="Email"
                  />

                  <input value={editStudent.batch_name}
                    onChange={(e)=>setEditStudent({...editStudent, batch_name:e.target.value})}
                    placeholder="Batch"
                  />

                  <input value={editStudent.mobile_no}
                    onChange={(e)=>setEditStudent({...editStudent, mobile_no:e.target.value})}
                    placeholder="Mobile"
                  />

                  <button onClick={updateStudent}>Update</button>
                  <button onClick={()=>setEditStudent(null)}>Cancel</button>
                </div>
              )}
            </>
          )}

  {/* RESULT */}
          {activeMenu === "result" && (
            <>
              <h2 style={{ textAlign: "center" }}>Result Management</h2>

              <div className={styles.tabs}>
                <button onClick={() => fetchResultsByExamType('all')}>All</button>
                <button onClick={() => fetchResultsByExamType('NDA')}>NDA</button>
                <button onClick={() => fetchResultsByExamType('NEET')}>NEET</button>
                <button onClick={() => fetchResultsByExamType('JEE')}>JEE</button>
                <button onClick={() => fetchResultsByExamType('SSB')}>SSB</button>
                <button onClick={() => fetchResultsByExamType('SSC')}>SSC</button>
                <button onClick={() => fetchResultsByExamType('Police')}>Police</button>
                <button onClick={() => fetchResultsByExamType('Other')}>Other</button>
              </div>

              <div className={styles.resultStats}>
                <div className={styles.statCard}>
                  <h4>Total Results</h4>
                  <p>{results.length}</p>
                </div>
                <div className={styles.statCard}>
                  <h4>Passed</h4>
                  <p>{results.filter(r => r.result_status === 'Pass').length}</p>
                </div>
                <div className={styles.statCard}>
                  <h4>Failed</h4>
                  <p>{results.filter(r => r.result_status === 'Fail').length}</p>
                </div>
              </div>

              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Attempt ID</th>
                    <th>Roll No</th>
                    <th>Name</th>
                    <th>Batch</th>
                    <th>Exam Type</th>
                    <th>Exam Name</th>
                    <th>Total Questions</th>
                    <th>Correct</th>
                    <th>Percentage</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {results.length > 0 ? results.map((result) => (
                    <tr key={result.attempt_id}>
                      <td>{result.attempt_id}</td>
                      <td>{result.roll_no || 'N/A'}</td>
                      <td>{result.student_name || 'N/A'}</td>
                      <td>{result.batch_name || 'N/A'}</td>
                      <td><span className={styles.examTypeBadge}>{result.exam_type}</span></td>
                      <td>{result.exam_name || 'N/A'}</td>
                      <td>{result.total_questions || 0}</td>
                      <td>{result.correct_answers || 0}</td>
                      <td><span className={`${result.percentage >= 40 ? styles.pass : styles.fail}`}>{result.percentage || 0}%</span></td>
                      <td><span className={result.result_status === 'Pass' ? styles.pass : styles.fail}>{result.result_status}</span></td>
                      <td>{new Date(result.start_time).toLocaleDateString()}</td>
                      <td>
                        <button 
                          className={styles.viewButton}
                          onClick={() => viewResultDetails(result.attempt_id)}
                        >
                          View
                        </button>
                        <button 
                          className={styles.deleteButton}
                          onClick={() => deleteResult(result.attempt_id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="11">No Results Available</td></tr>
                  )}
                </tbody>
              </table>
            </>
          )}

          {/* SETTINGS */}
          {activeMenu === "settings" && (
            <>
              {!editMode ? (
                <>
                  <h2 style={{ textAlign: "center" }}>Exam Settings</h2>

                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Exam Name</th>
                        <th>Exam Type</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Duration</th>
                        <th>Questions</th>
                        <th>Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {exams.length > 0 ? exams.map((exam) => (
                        <tr key={exam.exam_id}>
                          <td>{exam.exam_name}</td>
                          <td>{exam.exam_type}</td>
                          <td><span className={styles.upcoming}>{exam.exam_status || 'Available'}</span></td>
                          <td>{exam.exam_date}</td>
                          <td>{exam.exam_time}</td>
                          <td>{exam.duration_minutes} min</td>
                          <td>{exam.total_questions}</td>
                          <td>
                            <button onClick={()=>setEditMode(true)}>Edit</button>
                          </td>
                        </tr>
                      )) : (
                        <tr><td colSpan="8">No exams created yet</td></tr>
                      )}
                    </tbody>
                  </table>
                </>
              ) : (
                <div className={styles.card}>
                  <h2>Edit Exam</h2>

                  <input value={examName} onChange={(e)=>setExamName(e.target.value)} placeholder="Exam Name"/>
                  <input value={hour} onChange={(e)=>setHour(e.target.value)} placeholder="Hour"/>
                  <input value={minute} onChange={(e)=>setMinute(e.target.value)} placeholder="Minute"/>
                  <input type="date" value={date} onChange={(e)=>setDate(e.target.value)}/>

                  <button className={styles.btn}>Save</button>
                  <button className={styles.btn} onClick={()=>setEditMode(false)}>Back</button>
                </div>
              )}
            </>
          )}
          {/* ================= PROFILE ================= */}
          
          {activeMenu === "profile" && (

            <div className={styles.profileContainer}>

              {profileView === "view" && (
                <>
                  <div className={styles.profileHeader}>
                    <div>
                      <h2>Admin Profile</h2>
                      <p>Vijeeta Foundation</p>
                    </div>

                    <div className={styles.profileRight}>
                      <span>{adminData?.admin_name || 'Admin'}</span>
                      <div className={styles.profileImg}></div>
                    </div>
                  </div>

                  <div className={styles.topCard}>

                    <div className={styles.profileGrid}>

                      <div className={styles.profileBox}>
                        <h3>Personal Details</h3>
                        <p><b>Name:</b> {adminData?.admin_name || 'N/A'}</p>
                        <p><b>Admin ID:</b> VF-ADM-C01</p>
                        <p><b>Email:</b> {adminData?.email || 'N/A'}</p>
                        <p><b>Mobile:</b> {adminData?.mobile_no || 'N/A'}</p>
                        <p><b>Role:</b>Super Admin </p>
                      </div>

                      <div className={styles.profileBox}>
                        <h3>Academy Details</h3>
                        <p><b>Academy:</b> {adminData?.academy_name || 'Vijeeta Foundation'}</p>
                        <p><b>Branch:</b> Main Branch</p>
                        <p><b>Address:</b> {adminData?.city || 'Ashta'}, {adminData?.state || 'MH'}</p>
                        <p><b> Total Students:</b> {students.length}</p>
                        <p><b>Exams Conducted:</b> 25+</p>
                       
                      </div>

                    </div>

                    <div className={styles.securityBox}>
                      <h3>Security</h3>
                      <p><b>Last Login:</b> 25 July 2026</p>
                      <p><b>Status:</b> <span className={styles.activeStatus}>Active</span></p>
                      <p><b>Password Changed:</b> 20 July 2026</p>
                    </div>

                    <div className={styles.profileFooter}>
                      <button className={styles.commonBtn} onClick={()=>setProfileView("edit")}>Edit Profile</button>
                      <button className={styles.commonBtn} onClick={()=>setProfileView("password")}>Change Password</button>
                     <button className={`${styles.commonBtn} ${styles.logoutBtn}`} onClick={handleLogout}>Logout</button>
                    </div>

                  </div>
                </>
              )}

              {profileView === "edit" && (
                <div className={styles.card}>
                  <h2>Edit Profile</h2>

                  <input value={editName} onChange={(e)=>setEditName(e.target.value)} placeholder="Name"/>
                  <input value={editEmail} onChange={(e)=>setEditEmail(e.target.value)} placeholder="Email"/>
                  <input value={editMobile} onChange={(e)=>setEditMobile(e.target.value)} placeholder="Mobile"/>

                  <button className={styles.btn} onClick={updateAdminProfile}>Update</button>

                  <button className={styles.btn} onClick={()=>setProfileView("view")}>Back</button>
                </div>
              )}

              {profileView === "password" && (
                <div className={styles.card}>
                  <h2>Change Password</h2>

                  <input type="password" value={oldPass} onChange={(e)=>setOldPass(e.target.value)} placeholder="Old Password"/>
                  <input type="password" value={newPass} onChange={(e)=>setNewPass(e.target.value)} placeholder="New Password"/>
                  <input type="password" value={confirmPass} onChange={(e)=>setConfirmPass(e.target.value)} placeholder="Confirm Password"/>

                  <button className={styles.btn} onClick={changePassword}>Update Password</button>

                  <button className={styles.btn} onClick={()=>setProfileView("view")}>Back</button>
                </div>
              )}

            </div>
          )}

        </div>
      </div>
    </div>
  );
   }
  
                
                
          
                