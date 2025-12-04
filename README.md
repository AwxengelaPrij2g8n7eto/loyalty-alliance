# LoyaltyAlliance

A privacy-first decentralized loyalty platform enabling multiple brands to share encrypted customer data for joint reward programs while keeping individual customer details confidential. Customers' points and eligibility for campaigns are encrypted, and aggregation is performed without revealing personal data. All participants can access joint statistics without exposing sensitive customer information.

## Project Background

Retailers and e-commerce companies face challenges when attempting to collaborate on loyalty programs:

• Customer privacy: Sharing customer data can risk exposure of personal information
• Trust issues: Brands may not trust each other with raw customer data
• Data security: Risk of leaks or misuse of sensitive points and transaction data
• Limited analytics: Aggregated insights are hard to obtain without breaching privacy

This platform solves these problems by enabling brands to:

• Share encrypted customer points and eligibility securely
• Aggregate joint campaign statistics without exposing individual customer details
• Use blockchain-based smart contracts to store and manage encrypted data
• Ensure transparency, immutability, and trustless collaboration

## Features

### Core Functionality

• Customer Record Submission: Add encrypted customer ID, points, and campaign eligibility
• Points Aggregation: Compute and view encrypted totals per campaign
• Eligibility Verification: Check encrypted eligibility for joint campaigns
• Customer Listing: Brands can access customer lists without seeing raw details
• Anonymous Participation: Customer identities remain fully protected

### Privacy & Security

• Full Homomorphic Encryption: Customer points and eligibility are processed without decryption
• Immutable Blockchain Storage: Records are securely stored on-chain
• Encrypted Aggregation: Campaign statistics are aggregated without exposing individual data
• Access Control: Only authorized operations can trigger decryption events

## Architecture

### Smart Contracts

LoyaltyAllianceFHE.sol (deployed on Ethereum)

• Manages encrypted customer submissions (points and eligibility)
• Aggregates campaign participation counts automatically
• Provides public access to encrypted statistics
• Ensures secure and immutable data handling

### Frontend Application

• React + TypeScript: Interactive and responsive UI
• Ethers.js: Smart contract interaction
• Tailwind + CSS: Styling and responsive layout
• Dashboard: View campaigns, statistics, and customer aggregates
• Optional Wallet Integration: For participating brands or administrators

## Technology Stack

### Blockchain

• Solidity ^0.8.24: Smart contract development
• OpenZeppelin: Secure contract libraries
• Hardhat: Development, testing, and deployment
• Ethereum Sepolia Testnet: Current deployment environment

### Frontend

• React 18 + TypeScript: Modern UI framework
• Ethers.js: Blockchain interaction
• React Icons: User interface elements
• Tailwind + CSS: Styling and responsive design
• Vercel: Deployment platform

## Installation

### Prerequisites

• Node.js 18+
• npm / yarn / pnpm package manager
• Ethereum wallet (MetaMask, WalletConnect, etc.)

### Setup

```bash
# Install dependencies
npm install

# Compile contracts
npx hardhat compile

# Deploy to network (configure hardhat.config.js first)
npx hardhat run deploy/deploy.ts --network sepolia

# Start the development server
cd frontend

# Install frontend dependencies
npm install

# Run the frontend
npm run dev
```

## Usage

• Connect Wallet: Optional for administrators or brand representatives
• Add Encrypted Customer Records: Submit points and eligibility
• View Aggregated Statistics: Check campaign totals securely
• Search & Filter: Find records by campaign or criteria
• Monitor Eligibility: Verify participation without exposing identities

## Security Features

• Encrypted Submission: Customer points and eligibility are encrypted before submission
• Immutable Storage: Blockchain ensures records cannot be altered
• Privacy by Design: No personal data or raw points are revealed
• Secure Aggregation: Statistics are derived from encrypted data

## Future Enhancements

• Full Homomorphic Encryption (FHE) for complex computations on encrypted points
• Threshold-based alerts for campaigns exceeding limits
• Multi-chain deployment for broader adoption
• Mobile-optimized frontend
• DAO governance for collaborative decision-making

Built with ❤️ for secure and privacy-preserving loyalty programs in retail and e-commerce
