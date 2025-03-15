const axios = require("axios");

const API_URL = "http://localhost:3000";  // Update if your backend is running on a different port

// Function to test the /getRecords endpoint
async function testGetRecords() {
    try {
        const response = await axios.get(`${API_URL}/getRecords`);
        console.log("✅ GET /getRecords Response:", response.data);
    } catch (error) {
        console.error("❌ Error fetching records:", error.response?.data || error.message);
    }
}

// Function to test adding a new patient record
async function testAddRecord() {
    try {
        const newRecord = {
            patientID: "67890",
            name: "John Doe",
            age: 45,
            gender: "Male",
            symptoms: "Cough, Fever",
            diagnosis: "Flu"
        };

        const response = await axios.post(`${API_URL}/addRecord`, newRecord);
        console.log("✅ POST /addRecord Response:", response.data);
    } catch (error) {
        console.error("❌ Error adding record:", error.response?.data || error.message);
    }
}

// Run tests
async function runTests() {
    console.log("🔄 Running API Tests...");
    await testAddRecord();
    await testGetRecords();
}

// Execute tests
runTests();