#!/bin/bash

red='\033[0;31m' #defining green variable
green='\033[0;32m' #defining green variable
blue='\033[0;34m' #defining blue variable
white='\033[0;37m' #defining blue variable

echo "Running Mythril analysis..."
echo -e "${blue}Note: Analysis may take a while"
echo -e "${white}Checking Python version..."
PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
REQUIRED_VERSION="3.8"

# Compare versions
if [[ "$(printf '%s\n' "$REQUIRED_VERSION" "$PYTHON_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]]; then
    echo -e "${red}Python $REQUIRED_VERSION or higher is required. Found Python $PYTHON_VERSION."
    exit 1
fi
echo -e "${green}Python version is sufficient: $PYTHON_VERSION"

echo -e "${white}Checking if virtual environment exists..."
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    echo -e "${green}Virtual environment created successfully."
fi

echo -e "${white}Activating virtual environment..."
source venv/bin/activate

echo "Checking if Mythril is installed..."
if [ ! myth ]; then
    echo "Installing Mythril..."
    pip install mythril
    echo -e "${green}Mythril installed successfully."
fi

echo -e "${white}Flattenering contracts..."
npx hardhat flatten contracts/MultisigEscrowFactory.sol > MultisigEscrowFactoryFlattened.sol
npx hardhat flatten contracts/MultisigEscrow.sol > MultisigEscrowFlattened.sol

echo "Running Mythril analysis on MultisigEscrowFactory.sol..."
myth analyze MultisigEscrowFactoryFlattened.sol --solv 0.8.26
echo -e "${green}Mythril analysis completed for MultisigEscrowFactory.sol"

echo -e "${white}Running Mythril analysis on MultisigEscrow.sol..."
myth analyze MultisigEscrowFlattened.sol --solv 0.8.26
echo -e "${green}Mythril analysis completed for MultisigEscrow.sol"

echo -e "${white}Removing flattened files..."
rm -f MultisigEscrowFactoryFlattened.sol
rm -f MultisigEscrowFlattened.sol

echo "Deactivating virtual environment..."
deactivate

echo -e "${green}Mythril analysis completed."