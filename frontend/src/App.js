import React, { useState, useEffect } from "react";
import axios from "axios";
import styled from "styled-components";
import "bootstrap/dist/css/bootstrap.min.css";

const backendURL = "http://localhost:3000"; // Change if deploying

// Styled Components for UI Enhancements
const Container = styled.div`
  max-width: 800px;
  margin: auto;
  padding: 20px;
  background: #ffffff;
  border-radius: 10px;
  box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);
`;

const Button = styled.button`
  background: #007bff;
  color: white;
  border: none;
  padding: 10px 20px;
  font-size: 16px;
  cursor: pointer;
  border-radius: 5px;
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  &:hover {
    background: #0056b3;
  }
`;

const Card = styled.div`
  background: #f8f9fa;
  padding: 15px;
  border-radius: 8px;
  width: 100%;
  margin-bottom: 10px;
  box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);
`;

function App() {
  const [user, setUser] = useState(null);
  const [records, setRecords] = useState([]);
  const [patient, setPatient] = useState({
    patientID: "",
    patientName: "",
    age: "",
    gender: "",
    symptoms: "",
    diagnosis: ""
  });

  useEffect(() => {
    checkLogin();
  }, []);

  const checkLogin = () => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) {
      setUser(storedUser);
      fetchRecords(storedUser.role);
    }
  };

  const handleInputChange = (e) => {
    setPatient({ ...patient, [e.target.name]: e.target.value });
  };

  // 🔐 Login Function
  const login = async (email, password) => {
    try {
      const response = await axios.post(`${backendURL}/login`, { email, password });
      localStorage.setItem("user", JSON.stringify(response.data));
      setUser(response.data);
      fetchRecords(response.data.role);
    } catch (error) {
      alert("❌ Login failed: " + error.response?.data?.error);
    }
  };

  // 📂 Fetch Records (Patient can only view their own)
  const fetchRecords = async (role) => {
    if (!user) return;

    try {
      const response = await axios.get(`${backendURL}/fetchRecords`, {
        headers: { Authorization: user.token }
      });
      setRecords(response.data);
    } catch (error) {
      console.error("❌ Error fetching records:", error);
    }
  };

  // 🩺 Submit New Patient Record (Doctor Only)
  const submitPatientRecord = async () => {
    if (!user || user.role !== "doctor") {
      alert("⚠️ Only doctors can add records.");
      return;
    }

    if (!patient.patientID || !patient.patientName || !patient.age || !patient.gender || !patient.symptoms || !patient.diagnosis) {
      alert("⚠️ Please fill in all fields.");
      return;
    }

    try {
      const response = await axios.post(`${backendURL}/addRecord`, patient, {
        headers: { Authorization: user.token }
      });
      alert("✅ Patient record stored! IPFS Hash: " + response.data.ipfsHash);
      fetchRecords(user.role);
    } catch (error) {
      console.error("❌ Error storing patient record:", error);
      alert("❌ Failed to store record.");
    }
  };

  return (
    <div className="container mt-5">
      <Container>
        <h1 className="text-center text-primary">Decentralized Healthcare Records</h1>

        {/* Login Form */}
        {!user ? (
          <>
            <h2>🔑 Login</h2>
            <input type="email" placeholder="Email" onChange={(e) => setPatient({ ...patient, email: e.target.value })} className="form-control" />
            <input type="password" placeholder="Password" onChange={(e) => setPatient({ ...patient, password: e.target.value })} className="form-control mt-2" />
            <div className="text-center">
              <Button onClick={() => login(patient.email, patient.password)}>🔓 Login</Button>
            </div>
          </>
        ) : (
          <>
            <h2 className="mt-4">📌 Welcome, {user.role === "doctor" ? "Doctor" : "Patient"}</h2>

            {/* Doctor's Form to Add Patient Record */}
            {user.role === "doctor" && (
              <>
                <h2 className="mt-4">📌 Store New Patient Record</h2>
                <input type="text" name="patientID" placeholder="Patient Wallet Address" className="form-control" onChange={handleInputChange} />
                <input type="text" name="patientName" placeholder="Patient Name" className="form-control mt-2" onChange={handleInputChange} />
                <input type="number" name="age" placeholder="Age" className="form-control mt-2" onChange={handleInputChange} />
                <select name="gender" className="form-control mt-2" onChange={handleInputChange}>
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
                <input type="text" name="symptoms" placeholder="Symptoms" className="form-control mt-2" onChange={handleInputChange} />
                <input type="text" name="diagnosis" placeholder="Diagnosis" className="form-control mt-2" onChange={handleInputChange} />
                <div className="text-center">
                  <Button onClick={submitPatientRecord}>🩺 Store Patient Record</Button>
                </div>
              </>
            )}

            {/* Patient's Records */}
            <h2 className="mt-4">📂 Your Medical Records:</h2>
            {records.length > 0 ? (
              records.map((record, index) => (
                <Card key={index}>
                  <h5>👤 {record.patientName}</h5>
                  <p><strong>🆔 Age:</strong> {record.age} | <strong>⚧ Gender:</strong> {record.gender}</p>
                  <p><strong>🔬 Diagnosis:</strong> {record.diagnosis}</p>
                  <p><strong>🤒 Symptoms:</strong> {record.symptoms}</p>
                </Card>
              ))
            ) : (
              <p className="text-muted">No records found.</p>
            )}
          </>
        )}
      </Container>
    </div>
  );
}

export default App;
