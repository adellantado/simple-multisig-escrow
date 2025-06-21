// SPDX-License-Identifier: MIT

pragma solidity ^0.8.26;

import "./MultisigEscrow.sol";

contract MultisigEscrowFactory {
    
    event EscrowCreated(address indexed escrow, address indexed depositor, address indexed beneficiary);

    // Mapping from depositor address to array of their escrow contracts
    mapping(address => address[]) private _depositorContracts;

    function createEscrow(address payable beneficiary, uint32 deadlineDate) public payable returns (address) {
        MultisigEscrow escrow = new MultisigEscrow{value: msg.value}(
            payable(msg.sender),
            beneficiary,
            deadlineDate
        );
        address escrowAddress = address(escrow);
        
        // Store the contract address in the mapping
        _depositorContracts[msg.sender].push(escrowAddress);
        
        emit EscrowCreated(escrowAddress, msg.sender, beneficiary);
        return escrowAddress;
    }

    /**
     * @dev Get all escrow contracts created by a specific depositor
     * @param depositor The address of the depositor
     * @return Array of escrow contract addresses
     */
    function getDepositorContracts(address depositor) external view returns (address[] memory) {
        return _depositorContracts[depositor];
    }

    /**
     * @dev Get the number of escrow contracts created by a specific depositor
     * @param depositor The address of the depositor
     * @return Number of contracts
     */
    function getDepositorContractCount(address depositor) external view returns (uint256) {
        return _depositorContracts[depositor].length;
    }
} 