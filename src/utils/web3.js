import Web3 from "web3";
import { showGlobalError } from "./errorStore";

export const getWeb3 = async () => {
  // Check if MetaMask is installed
  if (window.ethereum) {
    try {
      // Request account access
      await window.ethereum.request({ method: "eth_requestAccounts" });
      // Create Web3 instance
      const web3 = new Web3(window.ethereum);
      return web3;
    } catch (error) {
      console.error("User denied account access");
      throw error;
    }
  } else {
    throw new Error("MetaMask is not installed");
  }
};

export const getContract = async (web3, contractABI, contractAddress) => {
  try {
    console.log("Initializing contract with:", {
      web3: !!web3,
      contractABI: contractABI,
      contractAddress
    });

    if (!web3) {
      throw new Error("Web3 instance is not initialized");
    }

    if (!contractABI || !Array.isArray(contractABI)) {
      console.error("Invalid contract ABI:", contractABI);
      throw new Error("Invalid contract ABI");
    }

    if (!contractAddress) {
      throw new Error("Contract address is required");
    }

    // Create contract instance with the ABI
    const contract = new web3.eth.Contract(contractABI, contractAddress);
    
    return contract;
  } catch (error) {
    console.error("Error creating contract instance:", error);
    throw error;
  }
};

/**
 * Format ETH amount to avoid floating point precision issues
 * @param {string|number} amount - The ETH amount to format
 * @returns {string} - Formatted ETH amount string
 */
export const formatEth = (amount) => {
  // Handle the amount as a string to avoid floating point precision issues
  if (typeof amount === 'string') {
    // If it's already a string, use it directly
    const trimmed = amount.replace(/\.?0+$/, '');
    return trimmed || '0';
  }
  
  // For numbers, convert to string with fixed precision and clean up
  const num = Number(amount);
  if (isNaN(num)) return '0';
  
  // Convert to string with 18 decimal places to match ETH precision
  const formatted = num.toFixed(18);
  // Remove trailing zeros after decimal point
  return formatted.replace(/\.?0+$/, '');
};

/**
 * Handle errors globally with automatic display
 * @param {Error|string} error - The error to handle
 * @param {string} context - Context message to prepend to the error
 * @param {number} duration - Duration to show the error (default: 5000ms)
 */
export const handleError = (error, context = "", duration = 5000) => {
  let errorMessage;
  if (error instanceof Error) {
    errorMessage = error.message;
    if (errorMessage.includes("JSON-RPC error")) {
      errorMessage = error.data.message;
    }
  } else {
    errorMessage = error;
  }
  
  const fullMessage = context ? `${context}: ${errorMessage}` : errorMessage;
  showGlobalError(fullMessage, duration);
  console.error(fullMessage, error);
};