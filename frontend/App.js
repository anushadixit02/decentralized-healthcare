import React, { useState, useEffect } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";

const API_URL = "http://localhost:3000";  // Ensure this matches your backend

function App() {
    const [patientID, setPatientID] = useState("");
    const [medicalData, setMedicalData] = useState("");
    const [records, setRecords] = useState([]);

    useEffect(() => {
        fetchRecords();
    }, []);

    const fetchRecords = async () => {
        const res = await axios.get(`${API_URL}/getRecords`);
        setRecords(res.data);
    };

    const addRecord = async (e) => {
        e.preventDefault();
        if (!patientID || !medicalData) return alert("All fields are required");

        const res = await axios.post(`${API_URL}/addRecord`, { patientID, medicalData });
        alert("Record added successfully!");
        fetchRecords();
    };

    return (
        <div className="container mt-5">
            <h2>Decentralized Healthcare Records</h2>
            <form onSubmit={addRecord}>
                <div className="mb-3">
                    <label>Patient ID</label>
                    <input type="text" className="form-control" value={patientID} onChange={(e) => setPatientID(e.target.value)} required />
                </div>
                <div className="mb-3">
                    <label>Medical Data</label>
                    <textarea className="form-control" value={medicalData} onChange={(e) => setMedicalData(e.target.value)} required />
                </div>
                <button type="submit" className="btn btn-primary">Add Record</button>
            </form>

            <h3 className="mt-5">Blockchain Records</h3>
            <table className="table">
                <thead>
                    <tr>
                        <th>Index</th>
                        <th>Timestamp</th>
                        <th>Patient ID</th>
                        <th>IPFS Hash</th>
                        <th>Hash</th>
                    </tr>
                </thead>
                <tbody>
                    {records.map((record, index) => (
                        <tr key={index}>
                            <td>{record.index}</td>
                            <td>{new Date(record.timestamp).toLocaleString()}</td>
                            <td>{record.patientID}</td>
                            <td>
                                <a href={`https://gateway.pinata.cloud/ipfs/${record.ipfsHash}`} target="_blank" rel="noopener noreferrer">
                                    View Data
                                </a>
                            </td>
                            <td>{record.hash.substring(0, 20)}...</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default App;