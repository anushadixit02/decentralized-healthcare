require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const axios = require("axios");
const Blockchain = require("./blockchain");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const healthcareBlockchain = new Blockchain();

// IPFS Upload Function
const PINATA_API_KEY = "58e519395cd931d48f85";
const PINATA_SECRET_API_KEY = "e8be04bdf025360a2db313252b487c94f37c87609cc8ad5f49413a067ea68c26";

const uploadToIPFS = async (data) => {
    const url = `https://api.pinata.cloud/pinning/pinJSONToIPFS`;
    try {
        const res = await axios.post(url, data, {
            headers: {
                pinata_api_key: "58e519395cd931d48f85",  // 
                pinata_secret_api_key: "e8be04bdf025360a2db313252b487c94f37c87609cc8ad5f49413a067ea68c26",
                "Content-Type": "application/json",
            },
            
        });
        return res.data.IpfsHash;
    } catch (error) {
        console.error("Error uploading to IPFS:", error);
        return null;
    }
};

// Add Patient Record
app.post("/addRecord", async (req, res) => {
    const { patientID, medicalData } = req.body;
    
    if (!patientID || !medicalData) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    const ipfsHash = await uploadToIPFS({ patientID, medicalData });

    if (!ipfsHash) {
        return res.status(500).json({ error: "Failed to upload to IPFS" });
    }

    const newBlock = new Block(
        healthcareBlockchain.chain.length,
        Date.now(),
        patientID,
        ipfsHash
    );

    healthcareBlockchain.addBlock(newBlock);
    res.json({ message: "Record added", block: newBlock });
});

// Get Blockchain Records
app.get("/getRecords", (req, res) => {
    res.json(healthcareBlockchain.chain);
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});