import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import styled from "styled-components";
import "bootstrap/dist/css/bootstrap.min.css";

const backendURL = "http://localhost:3000";

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
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [recordData, setRecordData] = useState({
    patientAddress: "",
    patientName: "",
    age: "",
    gender: "",
    symptoms: "",
    diagnosis: ""
  });

  // Wrap fetchRecords in useCallback to avoid missing dependency warning
  const fetchRecords = useCallback(async (currentUser) => {
    try {
      const response = await axios.get(`${backendURL}/fetchRecords`, {
        headers: { Authorization: `Bearer ${currentUser.token}` }
      });
      setRecords(response.data);
    } catch (error) {
      console.error("❌ Error fetching records:", error);
    }
  }, []);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) {
      setUser(storedUser);
      if (storedUser.role === "patient") {
        fetchRecords(storedUser);
      }
    }
  }, [fetchRecords]);

  const handleLoginInputChange = (e) => {
    setLoginData({ ...loginData, [e.target.name]: e.target.value });
  };

  const handleRecordInputChange = (e) => {
    setRecordData({ ...recordData, [e.target.name]: e.target.value });
  };

  // 🔐 Login Function
  const login = async () => {
    try {
      const response = await axios.post(`${backendURL}/login`, loginData);
      localStorage.setItem("user", JSON.stringify(response.data));
      setUser(response.data);
      // If the logged-in user is a patient, immediately fetch records
      if (response.data.role === "patient") {
        fetchRecords(response.data);
      }
    } catch (error) {
      alert("❌ Login failed: " + error.response?.data?.error);
    }
  };

  // 📤 Logout Function
  const logout = () => {
    localStorage.removeItem("user");
    setUser(null);
    setRecords([]);
  };

  // 🩺 Submit New Patient Record (Doctor Only)
  const submitPatientRecord = async () => {
    if (!user || user.role !== "doctor") {
      alert("⚠️ Only doctors can add records.");
      return;
    }
    if (
      !recordData.patientAddress ||
      !recordData.patientName ||
      !recordData.age ||
      !recordData.gender ||
      !recordData.symptoms ||
      !recordData.diagnosis
    ) {
      alert("⚠️ Please fill in all fields.");
      return;
    }
    try {
      const response = await axios.post(
        `${backendURL}/addRecord`,
        recordData,
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      alert("✅ Patient record stored! IPFS Hash: " + response.data.ipfsHash);
    } catch (error) {
      console.error("❌ Error storing patient record:", error);
      alert("❌ Failed to store record.");
    }
  };

  return (
    <div className="container mt-5">
      <Container>
        <h1 className="text-center text-primary">
          Decentralized Healthcare Records
        </h1>
        {!user ? (
          <>
            <h2>🔑 Login</h2>
            <input
              type="email"
              name="email"
              placeholder="Email"
              onChange={handleLoginInputChange}
              className="form-control"
            />
            <input
              type="password"
              name="password"
              placeholder="Password"
              onChange={handleLoginInputChange}
              className="form-control mt-2"
            />
            <div className="text-center">
              <Button onClick={login}>🔓 Login</Button>
            </div>
          </>
        ) : (
          <>
            <h2 className="mt-4">
              📌 Welcome, {user.role === "doctor" ? "Doctor" : "Patient"}
            </h2>

            {/* Doctor: Store New Patient Record */}
            {user.role === "doctor" && (
              <>
                <h2 className="mt-4">📌 Store New Patient Record</h2>
                <input
                  type="text"
                  name="patientAddress"
                  placeholder="Patient Wallet Address"
                  className="form-control"
                  onChange={handleRecordInputChange}
                />
                <input
                  type="text"
                  name="patientName"
                  placeholder="Patient Name"
                  className="form-control mt-2"
                  onChange={handleRecordInputChange}
                />
                <input
                  type="number"
                  name="age"
                  placeholder="Age"
                  className="form-control mt-2"
                  onChange={handleRecordInputChange}
                />
                <select
                  name="gender"
                  className="form-control mt-2"
                  onChange={handleRecordInputChange}
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
                <input
                  type="text"
                  name="symptoms"
                  placeholder="Symptoms"
                  className="form-control mt-2"
                  onChange={handleRecordInputChange}
                />
                <input
                  type="text"
                  name="diagnosis"
                  placeholder="Diagnosis"
                  className="form-control mt-2"
                  onChange={handleRecordInputChange}
                />
                <div className="text-center">
                  <Button onClick={submitPatientRecord}>
                    🩺 Store Patient Record
                  </Button>
                </div>
              </>
            )}

            {/* Patient: View Medical Records */}
            {user.role === "patient" && (
              <>
                <h2 className="mt-4">📂 Your Medical Records:</h2>
                {records.length > 0 ? (
                  records.map((record, index) => (
                    <Card key={index}>
                      <h5>👤 {record.patientName}</h5>
                      <p>
                        <strong>🆔 Age:</strong> {record.age} |{" "}
                        <strong>⚧ Gender:</strong> {record.gender}
                      </p>
                      <p>
                        <strong>🔬 Diagnosis:</strong> {record.diagnosis}
                      </p>
                      <p>
                        <strong>🤒 Symptoms:</strong> {record.symptoms}
                      </p>
                    </Card>
                  ))
                ) : (
                  <p className="text-muted">No records found.</p>
                )}
              </>
            )}

            {/* Logout Button */}
            <div className="text-center mt-4">
              <Button onClick={logout}>🔒 Logout</Button>
            </div>
          </>
        )}
      </Container>
    </div>
  );
}

export default App;
