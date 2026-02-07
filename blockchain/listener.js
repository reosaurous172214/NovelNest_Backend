import { ethers } from "ethers";
import User from "../models/User.js";
import dotenv from "dotenv";

dotenv.config();

const CONTRACT_ABI = [
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "author", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "totalAmount", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "authorShare", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "platformFee", "type": "uint256" }
    ],
    "name": "PaymentProcessed",
    "type": "event"
  }
];

const CONTRACT_ADDRESS = "0xF406F30CAf577EBaD19635f43d5676135eAeFB41";

/**
 * Robust Blockchain Listener using manual polling to avoid 'filter not found' errors.
 */
export const startBlockchainListener = () => {
  try {
    // 1. Initialize provider with polling enabled in options
    // This is the critical fix for Ethers v6 on public RPCs
    const provider = new ethers.JsonRpcProvider(
      "https://ethereum-sepolia-rpc.publicnode.com",
      undefined,
      { 
        staticNetwork: true, 
        polling: true // Forces ethers to use getLogs instead of filter IDs
      }
    );

    // 2. Set the frequency of checks (default is 4000ms)
    // Setting it explicitly here ensures stability
    provider.pollingInterval = 4000; 

    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

    console.log("🚀 NovelHub Listener Active: Using Stable Polling Mode");

    // 3. Define the listener logic
    const handlePayment = async (author, totalAmount, authorShare, platformFee) => {
      console.log(`💰 Payment Detected! Author: ${author}`);
      
      try {
        const amountInEth = ethers.formatEther(totalAmount);
        
        const user = await User.findOneAndUpdate(
          { walletAddress: author.toLowerCase() },
          { $inc: { "readingStats.totalEarnings": parseFloat(amountInEth) } },
          { new: true }
        );

        if (user) {
          console.log(`✅ Success: Updated earnings for ${user.username}.`);
        } else {
          console.log(`⚠️ No matching user for wallet: ${author}`);
        }
      } catch (dbError) {
        console.error("❌ Database Error:", dbError.message);
      }
    };

    // 4. Attach the listener
    contract.on("PaymentProcessed", handlePayment);

    // 5. Catch provider-level errors to prevent server crash
    provider.on("error", (error) => {
      console.error("🌐 Provider Error detected:", error.message);
      // Ethers v6 automatically attempts to recover if polling is enabled
    });

  } catch (error) {
    console.error("❌ Initialization Error:", error.message);
  }
};