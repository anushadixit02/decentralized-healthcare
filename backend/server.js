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

// 🔐 Secret Keys & Config
const secretKey = process.env.JWT_SECRET || "supersecretkey";
// Using a global encryption key as per current design (consider per-user/per-record keys in production)
const encryptionKey = process.env.SECRET_KEY || "my_super_secret_key";

// 🌍 Blockchain & IPFS Setup
const provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_SEPOLIA_URL);

const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const signer = wallet.connect(provider);
signer.resolveName = async () => null;
signer.getAddress = async () => wallet.address;

const contractABI = [
  "function owner() public view returns (address)",
  "function addDoctor(address _doctor) public",
  "function doctors(address) public view returns (bool)",
  "function addPatient(address _patient) public",
  "function storePatientRecord(address _patient, string memory _encryptedHash) public",
  "function getPatientRecords(address _patient) public view returns (string[] memory)"
];

const contractAddress =
  process.env.CONTRACT_ADDRESS ||
  "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";
let contract;

(async () => {
  try {
    const code = await provider.getCode(contractAddress);
    if (code === "0x") {
      throw new Error("No contract deployed at address: " + contractAddress);
    }
    contract = new ethers.Contract(contractAddress, contractABI, signer);
    console.log("✅ Contract Loaded Successfully!");
    const functionNames = contract.interface.fragments
      .filter((fragment) => fragment.type === "function")
      .map((fragment) => fragment.name);
    console.log("🔍 Smart Contract Methods:", functionNames);
  } catch (error) {
    console.error("❌ Error Loading Contract:", error.message);
  }
})();

// 🩺 Dummy User Database (Replace with a real DB later)
const users = [
  {
    id: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    email: "doctor@example.com",
    password: bcrypt.hashSync("doctor123", 10),
    role: "doctor"
  },
  {
    id: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    email: "patient@example.com",
    password: bcrypt.hashSync("patient123", 10),
    role: "patient"
  }
];

// ✅ User Login API
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = users.find((u) => u.email === email);

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  // Generate JWT Token (JWT tokens do not expire as per request)
  const token = jwt.sign(
    { id: ethers.getAddress(user.id), role: user.role, email: user.email },
    secretKey
  );
  res.json({ message: "Login successful", token, role: user.role });
});

// 🔐 Middleware: Verify Token
const verifyToken = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(403).json({ error: "Access denied" });

  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) return res.status(401).json({ error: "Invalid token" });
    req.user = decoded;
    next();
  });
};

// 🔐 Middleware: Verify Doctor Access
const verifyDoctor = async (req, res, next) => {
  try {
    console.log("🔍 Verifying Doctor:", req.user.id);
    const isDoctor = await contract.doctors(req.user.id);
    console.log("🩺 Doctor Verification Result:", isDoctor);
    if (!isDoctor)
      return res
        .status(403)
        .json({ error: "Only doctors can perform this action" });
    next();
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Doctor verification failed", details: error.message });
  }
};

// 🔐 Middleware: Verify Patient Access
const verifyPatient = (req, res, next) => {
  if (req.user.role !== "patient") {
    return res
      .status(403)
      .json({ error: "Only patients can view records" });
  }
  next();
};

// 🔐 Encryption / Decryption Utilities
const encryptData = (data, key) => {
  if (!key) return null;
  return CryptoJS.AES.encrypt(JSON.stringify(data), key).toString();
};

const decryptData = (encryptedData, key) => {
  const bytes = CryptoJS.AES.decrypt(encryptedData, key);
  const decrypted = bytes.toString(CryptoJS.enc.Utf8);
  return JSON.parse(decrypted);
};

// 📌 Upload Patient Data to IPFS via Pinata
const uploadToIPFS = async (data) => {
  const encryptedData = encryptData(data, encryptionKey);
  if (!encryptedData) return null;

  const url = "https://api.pinata.cloud/pinning/pinJSONToIPFS";
  try {
    const res = await axios.post(
      url,
      { pinataContent: encryptedData },
      {
        headers: {
          pinata_api_key: process.env.PINATA_API_KEY,
          pinata_secret_api_key: process.env.PINATA_SECRET_API_KEY,
          "Content-Type": "application/json"
        }
      }
    );
    return res.data.IpfsHash;
  } catch (error) {
    console.error("IPFS upload error:", error.message);
    return null;
  }
};

// 📝 Store Patient Record (Doctor Only)
app.post("/addRecord", verifyToken, verifyDoctor, async (req, res) => {
  const { patientAddress, patientName, age, gender, symptoms, diagnosis } =
    req.body;
  if (
    !patientAddress ||
    !patientName ||
    !age ||
    !gender ||
    !symptoms ||
    !diagnosis
  ) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    console.log("📡 Uploading record to IPFS...");
    const ipfsHash = await uploadToIPFS({
      patientName,
      age,
      gender,
      symptoms,
      diagnosis
    });
    if (!ipfsHash) {
      return res
        .status(500)
        .json({ error: "Failed to upload record to IPFS" });
    }

    console.log("✅ Uploaded to IPFS:", ipfsHash);

    let validatedPatientAddress;
    try {
      validatedPatientAddress = ethers.getAddress(patientAddress);
      console.log("📝 Using Patient Address:", validatedPatientAddress);
    } catch (error) {
      return res
        .status(400)
        .json({ error: "Invalid Ethereum address format for patient" });
    }

    console.log("🔍 Smart contract call details:");
    console.log("📍 Function: storePatientRecord");
    console.log("👤 Caller Address (from):", signer.address);
    console.log("🏥 Patient Address:", validatedPatientAddress);
    console.log("🔗 IPFS Hash:", ipfsHash);

    const tx = await contract.storePatientRecord(
      validatedPatientAddress,
      ipfsHash
    );
    await tx.wait();

    return res.json({ message: "Record stored!", ipfsHash });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to store record",
      details: error.message
    });
  }
});

// 📂 Fetch Records (Patient Only)
// Retrieves IPFS hashes from the smart contract, then downloads and decrypts data from Pinata.
app.get("/fetchRecords", verifyToken, verifyPatient, async (req, res) => {
  try {
    const patientAddress = ethers.getAddress(req.user.id);
    const ipfsHashes = await contract.getPatientRecords(patientAddress);
    let records = [];

    for (let hash of ipfsHashes) {
      const url = `https://gateway.pinata.cloud/ipfs/${hash}`;
      const ipfsRes = await axios.get(url);
      console.log("Raw IPFS response for hash", hash, ":", ipfsRes.data);
      
      let encryptedData;
      if (typeof ipfsRes.data === "string") {
        // If the response is a plain string, use it directly.
        encryptedData = ipfsRes.data;
      } else if (typeof ipfsRes.data === "object" && ipfsRes.data.pinataContent) {
        // Otherwise, if it's an object with a property named pinataContent, use that.
        encryptedData = ipfsRes.data.pinataContent;
      } else {
        console.error("Unexpected IPFS response format for hash", hash, ":", ipfsRes.data);
        continue; // Skip this record if the format is unexpected.
      }
      
      console.log("Encrypted data fetched:", encryptedData);
      const record = decryptData(encryptedData, encryptionKey);
      records.push(record);
    }
    res.json(records);
  } catch (error) {
    console.error("Error fetching records:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch records", details: error.message });
  }
});

// 🌍 Root Endpoint
app.get("/", (req, res) =>
  res.json({ message: "Welcome to the Decentralized Healthcare API!" })
);

// Optional: Global Error Handling Middleware
app.use((err, req, res, next) => {
  console.error("Global error handler:", err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🟢 Server running on port", PORT));