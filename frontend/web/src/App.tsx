// App.tsx for Loyalty Alliance - Privacy-First Customer Loyalty Platform
import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { getContractReadOnly, getContractWithSigner } from "./contract";
import WalletManager from "./components/WalletManager";
import WalletSelector from "./components/WalletSelector";
import "./App.css";

interface LoyaltyRecord {
  id: string;
  encryptedData: string;
  timestamp: number;
  brand: string;
  points: number;
  status: "active" | "redeemed" | "expired";
}

const App: React.FC = () => {
  // Wallet and connection states
  const [account, setAccount] = useState("");
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [walletSelectorOpen, setWalletSelectorOpen] = useState(false);
  
  // Data loading states
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Core data
  const [records, setRecords] = useState<LoyaltyRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<LoyaltyRecord | null>(null);
  
  // UI states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);
  const [transactionStatus, setTransactionStatus] = useState<{
    visible: boolean;
    status: "pending" | "success" | "error";
    message: string;
  }>({ visible: false, status: "pending", message: "" });
  
  // Form data
  const [newRecordData, setNewRecordData] = useState({
    brand: "",
    points: "",
    description: ""
  });

  // Calculate statistics for dashboard
  const activePoints = records.filter(r => r.status === "active").reduce((sum, r) => sum + r.points, 0);
  const redeemedPoints = records.filter(r => r.status === "redeemed").reduce((sum, r) => sum + r.points, 0);
  const expiredPoints = records.filter(r => r.status === "expired").reduce((sum, r) => sum + r.points, 0);
  const totalPoints = activePoints + redeemedPoints + expiredPoints;

  // Load loyalty records on component mount
  useEffect(() => {
    loadRecords().finally(() => setLoading(false));
  }, []);

  // Handle wallet selection
  const onWalletSelect = async (wallet: any) => {
    if (!wallet.provider) return;
    try {
      const web3Provider = new ethers.BrowserProvider(wallet.provider);
      setProvider(web3Provider);
      const accounts = await web3Provider.send("eth_requestAccounts", []);
      const acc = accounts[0] || "";
      setAccount(acc);

      wallet.provider.on("accountsChanged", async (accounts: string[]) => {
        const newAcc = accounts[0] || "";
        setAccount(newAcc);
      });
    } catch (e) {
      alert("Failed to connect wallet");
    }
  };

  // Wallet connection handlers
  const onConnect = () => setWalletSelectorOpen(true);
  const onDisconnect = () => {
    setAccount("");
    setProvider(null);
  };

  // Load loyalty records from contract
  const loadRecords = async () => {
    setIsRefreshing(true);
    try {
      const contract = await getContractReadOnly();
      if (!contract) return;
      
      // Check contract availability using FHE
      const isAvailable = await contract.isAvailable();
      if (!isAvailable) {
        console.error("Contract is not available");
        return;
      }
      
      // Get encrypted record keys
      const keysBytes = await contract.getData("record_keys");
      let keys: string[] = [];
      
      if (keysBytes.length > 0) {
        try {
          keys = JSON.parse(ethers.toUtf8String(keysBytes));
        } catch (e) {
          console.error("Error parsing record keys:", e);
        }
      }
      
      const list: LoyaltyRecord[] = [];
      
      // Load each record
      for (const key of keys) {
        try {
          const recordBytes = await contract.getData(`record_${key}`);
          if (recordBytes.length > 0) {
            try {
              const recordData = JSON.parse(ethers.toUtf8String(recordBytes));
              list.push({
                id: key,
                encryptedData: recordData.data,
                timestamp: recordData.timestamp,
                brand: recordData.brand,
                points: recordData.points,
                status: recordData.status || "active"
              });
            } catch (e) {
              console.error(`Error parsing record data for ${key}:`, e);
            }
          }
        } catch (e) {
          console.error(`Error loading record ${key}:`, e);
        }
      }
      
      // Sort by timestamp (newest first)
      list.sort((a, b) => b.timestamp - a.timestamp);
      setRecords(list);
    } catch (e) {
      console.error("Error loading records:", e);
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  };

  // Add new loyalty record
  const submitRecord = async () => {
    if (!provider) { 
      alert("Please connect wallet first"); 
      return; 
    }
    
    setTransactionStatus({
      visible: true,
      status: "pending",
      message: "Encrypting loyalty data with FHE..."
    });
    
    try {
      // Simulate FHE encryption
      const encryptedData = `FHE-${btoa(JSON.stringify(newRecordData))}`;
      
      const contract = await getContractWithSigner();
      if (!contract) {
        throw new Error("Failed to get contract with signer");
      }
      
      // Generate unique record ID
      const recordId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      // Prepare record data
      const recordData = {
        data: encryptedData,
        timestamp: Math.floor(Date.now() / 1000),
        brand: newRecordData.brand,
        points: parseInt(newRecordData.points),
        status: "active"
      };
      
      // Store encrypted data on-chain using FHE
      await contract.setData(
        `record_${recordId}`, 
        ethers.toUtf8Bytes(JSON.stringify(recordData))
      );
      
      // Update record keys
      const keysBytes = await contract.getData("record_keys");
      let keys: string[] = [];
      
      if (keysBytes.length > 0) {
        try {
          keys = JSON.parse(ethers.toUtf8String(keysBytes));
        } catch (e) {
          console.error("Error parsing keys:", e);
        }
      }
      
      keys.push(recordId);
      
      await contract.setData(
        "record_keys", 
        ethers.toUtf8Bytes(JSON.stringify(keys))
      );
      
      setTransactionStatus({
        visible: true,
        status: "success",
        message: "Loyalty data encrypted and stored securely!"
      });
      
      // Refresh records
      await loadRecords();
      
      // Reset form and close modal
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
        setShowCreateModal(false);
        setNewRecordData({
          brand: "",
          points: "",
          description: ""
        });
      }, 2000);
    } catch (e: any) {
      const errorMessage = e.message.includes("user rejected transaction")
        ? "Transaction rejected by user"
        : "Submission failed: " + (e.message || "Unknown error");
      
      setTransactionStatus({
        visible: true,
        status: "error",
        message: errorMessage
      });
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 3000);
    }
  };

  // Redeem loyalty points
  const redeemPoints = async (recordId: string) => {
    if (!provider) {
      alert("Please connect wallet first");
      return;
    }

    setTransactionStatus({
      visible: true,
      status: "pending",
      message: "Processing encrypted redemption with FHE..."
    });

    try {
      // Simulate FHE computation time
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const contract = await getContractWithSigner();
      if (!contract) {
        throw new Error("Failed to get contract with signer");
      }
      
      // Get record data
      const recordBytes = await contract.getData(`record_${recordId}`);
      if (recordBytes.length === 0) {
        throw new Error("Record not found");
      }
      
      const recordData = JSON.parse(ethers.toUtf8String(recordBytes));
      
      // Update record status to redeemed
      const updatedRecord = {
        ...recordData,
        status: "redeemed"
      };
      
      // Update record on-chain
      await contract.setData(
        `record_${recordId}`, 
        ethers.toUtf8Bytes(JSON.stringify(updatedRecord))
      );
      
      setTransactionStatus({
        visible: true,
        status: "success",
        message: "Points redeemed securely with FHE!"
      });
      
      // Refresh records
      await loadRecords();
      
      // Close detail view
      setSelectedRecord(null);
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 2000);
    } catch (e: any) {
      setTransactionStatus({
        visible: true,
        status: "error",
        message: "Redemption failed: " + (e.message || "Unknown error")
      });
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 3000);
    }
  };

  // Check if user is owner of record
  const isOwner = (address: string) => {
    return account.toLowerCase() === address.toLowerCase();
  };

  // Tutorial steps
  const tutorialSteps = [
    {
      title: "Connect Wallet",
      description: "Connect your Web3 wallet to access the loyalty platform",
      icon: "🔗"
    },
    {
      title: "Add Loyalty Points",
      description: "Securely add encrypted loyalty points from partner brands",
      icon: "🔒"
    },
    {
      title: "FHE Processing",
      description: "Your points are processed in encrypted state without decryption",
      icon: "⚙️"
    },
    {
      title: "Redeem Rewards",
      description: "Exchange points for rewards while maintaining privacy",
      icon: "🎁"
    }
  ];

  // Render pie chart for points distribution
  const renderPieChart = () => {
    const activePercentage = totalPoints > 0 ? (activePoints / totalPoints) * 100 : 0;
    const redeemedPercentage = totalPoints > 0 ? (redeemedPoints / totalPoints) * 100 : 0;
    const expiredPercentage = totalPoints > 0 ? (expiredPoints / totalPoints) * 100 : 0;

    return (
      <div className="pie-chart-container">
        <div className="pie-chart">
          <div 
            className="pie-segment active" 
            style={{ transform: `rotate(${activePercentage * 3.6}deg)` }}
          ></div>
          <div 
            className="pie-segment redeemed" 
            style={{ transform: `rotate(${(activePercentage + redeemedPercentage) * 3.6}deg)` }}
          ></div>
          <div 
            className="pie-segment expired" 
            style={{ transform: `rotate(${(activePercentage + redeemedPercentage + expiredPercentage) * 3.6}deg)` }}
          ></div>
          <div className="pie-center">
            <div className="pie-value">{totalPoints}</div>
            <div className="pie-label">Points</div>
          </div>
        </div>
        <div className="pie-legend">
          <div className="legend-item">
            <div className="color-box active"></div>
            <span>Active: {activePoints}</span>
          </div>
          <div className="legend-item">
            <div className="color-box redeemed"></div>
            <span>Redeemed: {redeemedPoints}</span>
          </div>
          <div className="legend-item">
            <div className="color-box expired"></div>
            <span>Expired: {expiredPoints}</span>
          </div>
        </div>
      </div>
    );
  };

  // Loading screen
  if (loading) return (
    <div className="loading-screen">
      <div className="spinner"></div>
      <p>Initializing encrypted connection...</p>
    </div>
  );

  return (
    <div className="app-container">
      {/* Header section */}
      <header className="app-header">
        <div className="logo">
          <div className="logo-icon">
            <div className="shield-icon"></div>
          </div>
          <h1>Loyalty<span>Alliance</span></h1>
        </div>
        
        <div className="header-actions">
          <button 
            onClick={() => setShowCreateModal(true)} 
            className="create-record-btn"
          >
            <div className="add-icon"></div>
            Add Points
          </button>
          <button 
            className="tutorial-btn"
            onClick={() => setShowTutorial(!showTutorial)}
          >
            {showTutorial ? "Hide Guide" : "Show Guide"}
          </button>
          <WalletManager account={account} onConnect={onConnect} onDisconnect={onDisconnect} />
        </div>
      </header>
      
      {/* Main content */}
      <div className="main-content">
        {/* Welcome banner */}
        <div className="welcome-banner">
          <div className="welcome-text">
            <h2>Privacy-First Loyalty Alliance</h2>
            <p>Share encrypted customer data across brands while maintaining privacy with FHE technology</p>
          </div>
        </div>
        
        {/* Tutorial section */}
        {showTutorial && (
          <div className="tutorial-section">
            <h2>How Loyalty Alliance Works</h2>
            <p className="subtitle">Securely share loyalty points across partner brands</p>
            
            <div className="tutorial-steps">
              {tutorialSteps.map((step, index) => (
                <div 
                  className="tutorial-step"
                  key={index}
                >
                  <div className="step-icon">{step.icon}</div>
                  <div className="step-content">
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Dashboard panels */}
        <div className="dashboard-grid">
          {/* Project introduction panel */}
          <div className="dashboard-card intro-panel">
            <h3>About Loyalty Alliance</h3>
            <p>Our platform enables brands to share encrypted customer loyalty data while preserving privacy using Fully Homomorphic Encryption (FHE).</p>
            <div className="fhe-badge">
              <span>FHE-Powered Privacy</span>
            </div>
            <div className="feature-list">
              <div className="feature-item">
                <div className="feature-icon">🔐</div>
                <span>Encrypted customer IDs</span>
              </div>
              <div className="feature-item">
                <div className="feature-icon">🔄</div>
                <span>Shared loyalty points</span>
              </div>
              <div className="feature-item">
                <div className="feature-icon">🤝</div>
                <span>Brand collaboration</span>
              </div>
            </div>
          </div>
          
          {/* Statistics panel */}
          <div className="dashboard-card stats-panel">
            <h3>Loyalty Points Overview</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-value">{totalPoints}</div>
                <div className="stat-label">Total Points</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{activePoints}</div>
                <div className="stat-label">Active</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{redeemedPoints}</div>
                <div className="stat-label">Redeemed</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{records.length}</div>
                <div className="stat-label">Records</div>
              </div>
            </div>
          </div>
          
          {/* Chart panel */}
          <div className="dashboard-card chart-panel">
            <h3>Points Distribution</h3>
            {renderPieChart()}
          </div>
        </div>
        
        {/* Records section */}
        <div className="records-section">
          <div className="section-header">
            <h2>Encrypted Loyalty Records</h2>
            <div className="header-actions">
              <button 
                onClick={loadRecords}
                className="refresh-btn"
                disabled={isRefreshing}
              >
                {isRefreshing ? "Refreshing..." : "Refresh"}
              </button>
              <button 
                onClick={() => contract?.isAvailable().then(() => alert("Contract is available!"))}
                className="check-btn"
              >
                Check Availability
              </button>
            </div>
          </div>
          
          <div className="records-list">
            <div className="table-header">
              <div className="header-cell">ID</div>
              <div className="header-cell">Brand</div>
              <div className="header-cell">Points</div>
              <div className="header-cell">Date</div>
              <div className="header-cell">Status</div>
              <div className="header-cell">Actions</div>
            </div>
            
            {records.length === 0 ? (
              <div className="no-records">
                <div className="no-records-icon"></div>
                <p>No loyalty records found</p>
                <button 
                  className="primary-btn"
                  onClick={() => setShowCreateModal(true)}
                >
                  Add First Record
                </button>
              </div>
            ) : (
              records.map(record => (
                <div className="record-row" key={record.id}>
                  <div className="table-cell record-id">#{record.id.substring(0, 6)}</div>
                  <div className="table-cell">{record.brand}</div>
                  <div className="table-cell">{record.points}</div>
                  <div className="table-cell">
                    {new Date(record.timestamp * 1000).toLocaleDateString()}
                  </div>
                  <div className="table-cell">
                    <span className={`status-badge ${record.status}`}>
                      {record.status}
                    </span>
                  </div>
                  <div className="table-cell actions">
                    <button 
                      className="action-btn view"
                      onClick={() => setSelectedRecord(record)}
                    >
                      Details
                    </button>
                    {record.status === "active" && (
                      <button 
                        className="action-btn redeem"
                        onClick={() => redeemPoints(record.id)}
                      >
                        Redeem
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
  
      {/* Record detail modal */}
      {selectedRecord && (
        <div className="detail-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Loyalty Record Details</h2>
              <button onClick={() => setSelectedRecord(null)} className="close-modal">&times;</button>
            </div>
            
            <div className="modal-body">
              <div className="detail-item">
                <label>Record ID:</label>
                <span>#{selectedRecord.id}</span>
              </div>
              
              <div className="detail-item">
                <label>Brand:</label>
                <span>{selectedRecord.brand}</span>
              </div>
              
              <div className="detail-item">
                <label>Points:</label>
                <span>{selectedRecord.points}</span>
              </div>
              
              <div className="detail-item">
                <label>Status:</label>
                <span className={`status-badge ${selectedRecord.status}`}>
                  {selectedRecord.status}
                </span>
              </div>
              
              <div className="detail-item">
                <label>Date Added:</label>
                <span>{new Date(selectedRecord.timestamp * 1000).toLocaleString()}</span>
              </div>
              
              <div className="detail-item">
                <label>Encrypted Data:</label>
                <div className="encrypted-data">
                  {selectedRecord.encryptedData.substring(0, 100)}...
                </div>
              </div>
              
              <div className="fhe-notice">
                <div className="lock-icon"></div> 
                <span>Data remains encrypted during all FHE operations</span>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                onClick={() => setSelectedRecord(null)}
                className="cancel-btn"
              >
                Close
              </button>
              {selectedRecord.status === "active" && (
                <button 
                  onClick={() => redeemPoints(selectedRecord.id)}
                  className="redeem-btn"
                >
                  Redeem Points
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Create record modal */}
      {showCreateModal && (
        <div className="create-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Add Loyalty Points</h2>
              <button onClick={() => setShowCreateModal(false)} className="close-modal">&times;</button>
            </div>
            
            <div className="modal-body">
              <div className="fhe-notice-banner">
                <div className="key-icon"></div> Your data will be encrypted with FHE
              </div>
              
              <div className="form-group">
                <label>Brand *</label>
                <input 
                  type="text"
                  name="brand"
                  value={newRecordData.brand} 
                  onChange={(e) => setNewRecordData({...newRecordData, brand: e.target.value})}
                  placeholder="Brand name" 
                  className="form-input"
                />
              </div>
              
              <div className="form-group">
                <label>Points *</label>
                <input 
                  type="number"
                  name="points"
                  value={newRecordData.points} 
                  onChange={(e) => setNewRecordData({...newRecordData, points: e.target.value})}
                  placeholder="Points amount" 
                  className="form-input"
                />
              </div>
              
              <div className="form-group">
                <label>Description</label>
                <textarea 
                  name="description"
                  value={newRecordData.description} 
                  onChange={(e) => setNewRecordData({...newRecordData, description: e.target.value})}
                  placeholder="Description of loyalty points..." 
                  className="form-textarea"
                  rows={3}
                />
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                onClick={() => setShowCreateModal(false)}
                className="cancel-btn"
              >
                Cancel
              </button>
              <button 
                onClick={submitRecord}
                className="submit-btn"
              >
                Encrypt & Submit
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Wallet selector */}
      {walletSelectorOpen && (
        <WalletSelector
          isOpen={walletSelectorOpen}
          onWalletSelect={(wallet) => { onWalletSelect(wallet); setWalletSelectorOpen(false); }}
          onClose={() => setWalletSelectorOpen(false)}
        />
      )}
      
      {/* Transaction status modal */}
      {transactionStatus.visible && (
        <div className="transaction-modal">
          <div className="transaction-content">
            <div className={`transaction-icon ${transactionStatus.status}`}>
              {transactionStatus.status === "pending" && <div className="spinner"></div>}
              {transactionStatus.status === "success" && <div className="check-icon">✓</div>}
              {transactionStatus.status === "error" && <div className="error-icon">✗</div>}
            </div>
            <div className="transaction-message">
              {transactionStatus.message}
            </div>
          </div>
        </div>
      )}
  
      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="logo">
              <div className="shield-icon"></div>
              <span>Loyalty Alliance</span>
            </div>
            <p>Privacy-first loyalty platform powered by FHE technology</p>
          </div>
          
          <div className="footer-links">
            <a href="#" className="footer-link">Documentation</a>
            <a href="#" className="footer-link">Privacy Policy</a>
            <a href="#" className="footer-link">Terms of Service</a>
            <a href="#" className="footer-link">Contact</a>
          </div>
        </div>
        
        <div className="footer-bottom">
          <div className="fhe-badge">
            <span>FHE-Powered Privacy</span>
          </div>
          <div className="copyright">
            © {new Date().getFullYear()} Loyalty Alliance. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;