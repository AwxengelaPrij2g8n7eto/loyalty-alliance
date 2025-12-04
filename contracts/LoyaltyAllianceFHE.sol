// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint32, ebool } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract LoyaltyAllianceFHE is SepoliaConfig {
    struct EncryptedCustomer {
        uint256 id;
        euint32 encryptedPoints;
        ebool isEligible;   // Eligibility for joint campaign
        uint256 timestamp;
    }

    struct DecryptedCustomer {
        uint32 points;
        bool isEligible;
        bool revealed;
    }

    uint256 public customerCount;
    mapping(uint256 => EncryptedCustomer) public encryptedCustomers;
    mapping(uint256 => DecryptedCustomer) public decryptedCustomers;

    mapping(string => euint32) private encryptedCampaignCount;
    string[] private campaignList;

    mapping(uint256 => uint256) private requestToCustomerId;

    event CustomerAdded(uint256 indexed id, uint256 timestamp);
    event DecryptionRequested(uint256 indexed id);
    event CustomerDecrypted(uint256 indexed id);

    modifier onlyCustomer(uint256 customerId) {
        // Add access control if needed
        _;
    }

    /// @notice Add a new encrypted customer record
    function addEncryptedCustomer(
        euint32 encryptedPoints,
        ebool eligibility
    ) public {
        customerCount += 1;
        uint256 newId = customerCount;

        encryptedCustomers[newId] = EncryptedCustomer({
            id: newId,
            encryptedPoints: encryptedPoints,
            isEligible: eligibility,
            timestamp: block.timestamp
        });

        decryptedCustomers[newId] = DecryptedCustomer({
            points: 0,
            isEligible: false,
            revealed: false
        });

        emit CustomerAdded(newId, block.timestamp);
    }

    /// @notice Request decryption of a customer's points
    function requestCustomerDecryption(uint256 customerId) public onlyCustomer(customerId) {
        EncryptedCustomer storage customer = encryptedCustomers[customerId];
        require(!decryptedCustomers[customerId].revealed, "Already decrypted");

        bytes32 ;
        ciphertexts[0] = FHE.toBytes32(customer.encryptedPoints);
        ciphertexts[1] = FHE.toBytes32(customer.isEligible);

        uint256 reqId = FHE.requestDecryption(ciphertexts, this.decryptCustomer.selector);
        requestToCustomerId[reqId] = customerId;

        emit DecryptionRequested(customerId);
    }

    /// @notice Callback for decrypted customer data
    function decryptCustomer(
        uint256 requestId,
        bytes memory cleartexts,
        bytes memory proof
    ) public {
        uint256 customerId = requestToCustomerId[requestId];
        require(customerId != 0, "Invalid request");

        EncryptedCustomer storage eCustomer = encryptedCustomers[customerId];
        DecryptedCustomer storage dCustomer = decryptedCustomers[customerId];
        require(!dCustomer.revealed, "Already decrypted");

        FHE.checkSignatures(requestId, cleartexts, proof);

        (uint32 points, bool eligibility) = abi.decode(cleartexts, (uint32, bool));

        dCustomer.points = points;
        dCustomer.isEligible = eligibility;
        dCustomer.revealed = true;

        emit CustomerDecrypted(customerId);
    }

    /// @notice Get decrypted customer data
    function getDecryptedCustomer(uint256 customerId) public view returns (
        uint32 points,
        bool isEligible,
        bool revealed
    ) {
        DecryptedCustomer storage c = decryptedCustomers[customerId];
        return (c.points, c.isEligible, c.revealed);
    }

    /// @notice Track encrypted campaign participation
    function trackEncryptedCampaign(string memory campaign, euint32 encryptedCount) public {
        if (!FHE.isInitialized(encryptedCampaignCount[campaign])) {
            encryptedCampaignCount[campaign] = encryptedCount;
            campaignList.push(campaign);
        } else {
            encryptedCampaignCount[campaign] = FHE.add(encryptedCampaignCount[campaign], encryptedCount);
        }
    }

    /// @notice Get encrypted campaign count
    function getEncryptedCampaignCount(string memory campaign) public view returns (euint32) {
        return encryptedCampaignCount[campaign];
    }
}
