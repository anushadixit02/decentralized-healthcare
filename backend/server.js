const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const { ethers } = require("ethers");
const CryptoJS = require("crypto-js");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

console.log("🟢 Starting Backend Server...");

// 🔐 Secret Key for JWT Authentication
const secretKey = process.env.JWT_SECRET || "supersecretkey";
const encryptionKey = process.env.SECRET_KEY || "my_super_secret_key"; // Ensure encryption key is set

// 🌍 Blockchain & IPFS Setup
const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const signer = wallet.connect(provider);
const contractABI = [
    "function storePatientRecord(address _patient, string memory _encryptedHash) public",
    "function getPatientRecords(address _patient) public view returns (string[] memory)"
];
const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, contractABI, signer);

// 🚀 Completely Disable ENS Resolution
signer.resolveName = async () => null;
signer.getAddress = async () => wallet.address; // ✅ Forces Hardhat to use address directly

// 🩺 Dummy User Database (Replace with real DB later)
const users = [
    { id: "0x1234567890abcdef", email: "doctor@example.com", password: bcrypt.hashSync("doctor123", 10), role: "doctor" },
    { id: "0xabcdef1234567890", email: "patient@example.com", password: bcrypt.hashSync("patient123", 10), role: "patient" }
];

// ✅ User Login API
app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email);
    
    if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate JWT Token
    const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, secretKey, { expiresIn: "1h" });
    res.json({ message: "Login successful", token, role: user.role });
});

// 🔐 Middleware: Verify Token
const verifyToken = (req, res, next) => {
    const token = req.headers["authorization"];
    console.log("🔍 Received Token:", token);

    if (!token) {
        console.error("❌ No token provided");
        return res.status(403).json({ error: "Access denied" });
    }

    const tokenWithoutBearer = token.split(" ")[1]; // Remove 'Bearer' prefix
    console.log("🔍 Token Without Bearer:", tokenWithoutBearer);

    jwt.verify(tokenWithoutBearer, secretKey, (err, decoded) => {
        if (err) {
            console.error("❌ JWT Verification Failed:", err.message);
        return res.status(401).json({ error: "Invalid token" });
        }
        console.log("✅ Token Verified:", decoded);
        req.user = decoded;
        next();
    });
};

// 🔐 Middleware: Verify Doctor Access
const verifyDoctor = (req, res, next) => {
    if (req.user.role !== "doctor") {
        return res.status(403).json({ error: "Only doctors can add records" });
    }
    next();
};

// 🔐 Middleware: Verify Patient Access
const verifyPatient = (req, res, next) => {
    if (req.user.role !== "patient") {
        return res.status(403).json({ error: "Only patients can view records" });
    }
    next();
};

// 📌 Encrypt and Upload Patient Data to IPFS
const encryptData = (data, secretKey) => {
    if (!secretKey) {
        console.error("❌ Encryption Key is missing!");
        return null;
    }
    return CryptoJS.AES.encrypt(JSON.stringify(data), secretKey).toString();
};

const uploadToIPFS = async (data) => {
    console.log("🔐 Encrypting data...");
    const encryptedData = encryptData(data, encryptionKey);
    
    if (!encryptedData) {
        console.error("❌ Encryption Failed");
        return null;
    }

    const url = "https://api.pinata.cloud/pinning/pinJSONToIPFS";

    try {
        console.log("📡 Uploading encrypted data to IPFS...");
        const res = await axios.post(url, { pinataContent: encryptedData }, {
            headers: {
                pinata_api_key: process.env.PINATA_API_KEY,
                pinata_secret_api_key: process.env.PINATA_SECRET_API_KEY,
                "Content-Type": "application/json",
            },
        });
        console.log("✅ IPFS Upload Successful:", res.data);
        return res.data.IpfsHash;
    } catch (error) {
        console.error("❌ Error uploading to IPFS:", error.message);
        return null;
    }
};

// 📝 Store Patient Record (Doctor Only)
app.post("/addRecord", verifyToken, verifyDoctor, async (req, res) => {
    const { patientName, age, gender, symptoms, diagnosis } = req.body;
    
    console.log("🔍 Received Data:", { patientName, age, gender, symptoms, diagnosis });

    if (!patientName || !age || !gender || !symptoms || !diagnosis) {
        console.error("❌ Missing required fields");
        return res.status(400).json({ error: "Missing required fields" });
    }

    const patientRecord = { patientName, age, gender, symptoms, diagnosis };

    try {
        console.log("📡 Uploading record to IPFS...");
        const ipfsHash = await uploadToIPFS(patientRecord);
        
        if (!ipfsHash) {
            console.error("❌ Failed to upload to IPFS");
            return res.status(500).json({ error: "Failed to upload record to IPFS" });
        }

        console.log("✅ Uploaded to IPFS:", ipfsHash);

        console.log("📡 Storing IPFS hash on blockchain...");
        const tx = await contract.storePatientRecord(req.user.id, ipfsHash);
        console.log("⏳ Transaction sent, waiting for confirmation...");
        await tx.wait();

        console.log("✅ Transaction successful:", tx);

        res.json({ message: "Record stored!", ipfsHash });
    } catch (error) {
        console.error("❌ Error storing patient record:", error.message);
        res.status(500).json({ error: "Failed to store record", details: error.message });
    }
});

// 🌍 Start Express Server
const PORT = process.env.PORT || 3000;
app.get("/", (req, res) => {
    res.json({ message: "Welcome to the Decentralized Healthcare API!" });
});
app.listen(PORT, () => {
    console.log(`🟢 Server running on port ${PORT}`);
});
