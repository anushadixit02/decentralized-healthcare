// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract HealthcareDataset {
    address public owner;

    mapping(address => bool) public doctors;
    mapping(address => bool) public patients;
    mapping(address => string[]) private patientRecords; // Stores encrypted IPFS hashes per patient

    event DoctorAdded(address doctor);
    event PatientAdded(address patient);
    event RecordAdded(address patient, string ipfsHash);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can perform this action");
        _;
    }

    modifier onlyDoctor() {
        require(doctors[msg.sender], "Only doctors can perform this action");
        _;
    }

    modifier onlyPatient() {
        require(patients[msg.sender], "Only patients can view their records");
        _;
    }

    modifier onlyAuthorized() {
        require(
            doctors[msg.sender] || patients[msg.sender],
            "Not authorized"
        );
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function addDoctor(address _doctor) public onlyOwner {
        doctors[_doctor] = true;
        emit DoctorAdded(_doctor);
    }

    function addPatient(address _patient) public onlyOwner {
        patients[_patient] = true;
        emit PatientAdded(_patient);
    }

    function storePatientRecord(address _patient, string memory _encryptedHash)
        public
        onlyDoctor
    {
        require(patients[_patient], "Invalid patient address");
        patientRecords[_patient].push(_encryptedHash);
        emit RecordAdded(_patient, _encryptedHash);
    }

    function getPatientRecords(address _patient)
        public
        view
        onlyAuthorized
        returns (string[] memory)
    {
        return patientRecords[_patient];
    }
}
