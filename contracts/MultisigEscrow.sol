// SPDX-License-Identifier: MIT

pragma solidity ^0.8.26;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/Multicall.sol";

/**
 * @title MultisigEscrow
 * @dev A contract for managing a multisig escrow agreement between a depositor and a beneficiary.
 * The contract allows the depositor to fund the agreement, the beneficiary to approve or reject it.
 * The parties agree on a multisig address for dispute resolution.
 */
contract MultisigEscrow is ReentrancyGuard, Pausable, Multicall {

    struct Agreement {

        // 1st slot (20 bytes)
        // aka "buyer"
        address payable depositor;

        // 2nd slot (29 bytes)
        // aka "seller"
        address payable beneficiary;
        // end date for result delivery, aka "delivery date"
        uint32 deadlineDate;
        // agreement started at
        uint32 startDate;
        // agreement status
        Status status;

        // 3th slot (21 bytes)
        // multisig address set by beneficiary, needed only for dispute resolution
        // note: if needed this address could be set to arbitrator address
        address multisig;
        // depositor approves multisig set by beneficiary
        // note: if needed this could approve arbitrator set by the beneficiary 
        bool approved;
    }

    enum Status {
        // The workflow for an "Agreement"
        //
        // Funds added to the escrow
        // ||
        // \/
        Funded,
        // ||
        // \/
        // Depositor changed his mind, if beneficiary haven't agreed yet
        Revoked,
        // 
        // Funded 
        // ||
        // \/
        // Beneficiary rejected the agreement
        Rejected,
        //
        // Funded
        // ||
        // \/
        // Beneficiary agreed on terms
        Active,
        // ||
        // \/
        // Beneficiary decided to return funds
        Refunded,
        //
        // Active
        // ||
        // \/
        // Depositor released the funds or the beneficiary claimed funds after the deadline
        Closed,
        //
        // Active
        // ||
        // \/
        // Depositor locks the funds after the deadline
        Locked
    }

    uint256 public constant RELEASE_FUNDS_AFTER_DEADLINE = 3 days;

    Agreement internal _agreement;

    event AgreementCreated(address indexed depositor, address indexed beneficiary, 
        uint96 amount, uint32 deadlineDate);
    event AgreementRevoked();
    event AgreementApproved();
    event AgreementRejected();
    event AgreementRefunded();
    event FundsAdded(uint96 amount, uint256 totalAmount);
    event FundsWithdrawn(address indexed recipient, uint256 amount);
    event FundsReleased();
    event FundsLocked();
    event MultisigSet(address indexed multisig);
    event MultisigApproved(address indexed multisig);
    event FundsCompensated(uint256 amount);

    modifier checkAddress(address user) {
        require(user != address(0), "zero address");
        _;
    }

    modifier onlyDepositor() {
        require(_msgSender() == address(_agreement.depositor), "only depositor");
        _;
    }

    modifier onlyBeneficiary() {
        require(_msgSender() == address(_agreement.beneficiary), "only beneficiary");
        _;
    }

    modifier onlyDepositorOrBeneficiary() {
        require(_msgSender() == address(_agreement.depositor) || 
            _msgSender() == address(_agreement.beneficiary), "only depositor/beneficiary.");
        _;
    }

    modifier inStatus(Status status) {
        require(_agreement.status == status, "wrong status");
        _;
    }

    modifier onlyMultisig() {
        require(_msgSender() == _agreement.multisig, "only multisig");
        _;
    }

    /**
     * @dev Constructor to initialize the escrow agreement.
     * @param beneficiary The address of the beneficiary who will receive the funds.
     * @param deadlineDate The deadline date for the agreement in Unix timestamp format.
     * @notice The contract must be funded with an initial amount of funds.
     * @notice The contract will emit an AgreementCreated event upon successful creation.
     */
    constructor(
        address payable depositor, 
        address payable beneficiary,
        uint32 deadlineDate
    ) payable checkAddress(beneficiary) {
        _agreement = Agreement({
            depositor: depositor,
            beneficiary: beneficiary,
            deadlineDate: deadlineDate,
            startDate: uint32(block.timestamp),
            status: Status.Funded,
            multisig: address(0),
            approved: false
        });
        emit AgreementCreated(_msgSender(), beneficiary, uint96(msg.value), deadlineDate);
    }

    /**
     * @dev Fallback function to receive funds.
     * @notice This function allows the contract to receive funds when the status is Funded or Active.
     * @notice It emits a FundsAdded event with the amount sent and the total balance of the contract.
     */
    receive() external payable onlyDepositor {
        require(_agreement.status == Status.Funded || _agreement.status == Status.Active, "wrong status");
        require(msg.value > 0, "no funds sent");
        emit FundsAdded(uint96(msg.value), address(this).balance);
    }

    /**
     * @dev Revoke the agreement. The depositor can call this function to cancel the agreement.
     * @notice Only the depositor can call this function when the status is Funded.
     * @notice It changes the status to Revoked and emits an AgreementRevoked event.
     */
    function revokeAgreement() external onlyDepositor inStatus(Status.Funded) {
        _agreement.status = Status.Revoked;
        emit AgreementRevoked();
    }

    /**
     * @dev Approve the agreement. The beneficiary can call this function to agree on the terms.
     * @notice Only the beneficiary can call this function when the status is Funded.
     * @notice It changes the status to Active and emits an AgreementApproved event.
     */
    function approveAgreement() external onlyBeneficiary inStatus(Status.Funded) {
        _agreement.status = Status.Active;
        emit AgreementApproved();
    }

    /**
     * @dev Reject the agreement. The beneficiary can call this function to reject the terms.
     * @notice Only the beneficiary can call this function when the status is Funded.
     * @notice It changes the status to Rejected and emits an AgreementRejected event.
     */
    function rejectAgreement() external onlyBeneficiary inStatus(Status.Funded) {
        _agreement.status = Status.Rejected;
        emit AgreementRejected();
    }

    /**
     * @dev Refund the agreement. The beneficiary can call this function to give full refund.
     * @notice Only the beneficiary can call this function when the status is Active.
     * @notice It changes the status to Refunded and emits an AgreementRefunded event.
     */
    function refundAgreement() external onlyBeneficiary inStatus(Status.Active) {
        _agreement.status = Status.Refunded;
        emit AgreementRefunded();
    }

    /**
     * @dev Release the funds. The beneficiary can also call this function to release the funds after 
     * the deadline is reached and the funds wasn't locked by the depositor.
     * @notice Only the depositor or beneficiary can call this function when the status is Active.
     * @notice If called by the beneficiary, it requires that the current time is at least 3 days after the deadline.
     * @notice It changes the status to Closed and emits a FundsReleased event.
     */
    function releaseFunds() external onlyDepositorOrBeneficiary inStatus(Status.Active) {
        if (_msgSender() == _agreement.beneficiary) {
            require(block.timestamp >= _agreement.deadlineDate + RELEASE_FUNDS_AFTER_DEADLINE, 
                "can be released after: deadline + 3 days");
        }
        _agreement.status = Status.Closed;
        emit FundsReleased();
    }

    /**
     * @dev Withdraw funds. The beneficiary can call this function to withdraw the funds after the agreement is closed.
     * @notice Only the beneficiary can call this function when the status is Closed.
     * @notice It transfers the entire balance of the contract to the beneficiary and emits a FundsWithdrawn event.
     */
    function withdrawFunds() external payable onlyBeneficiary inStatus(Status.Closed) nonReentrant {
        require(address(this).balance > 0, "funds not available");
        (bool success, ) =  _agreement.beneficiary.call{value: address(this).balance}("");
        require(success, "transfer failed");
        emit FundsWithdrawn(_msgSender(), address(this).balance);
        _pause();
    }

    /**
     * @dev Remove funds. The depositor can call this function to remove the funds if the agreement is revoked, rejected, or refunded.
     * @notice Only the depositor can call this function when the status is Revoked, Rejected, or Refunded.
     * @notice It transfers the entire balance of the contract to the depositor and emits a FundsWithdrawn event.
     */
    function removeFunds() external payable onlyDepositor nonReentrant {
        require(_agreement.status == Status.Revoked || _agreement.status == Status.Rejected || 
            _agreement.status == Status.Refunded, "wrong status");
        require(address(this).balance > 0, "funds not available");
        (bool success, ) =  _agreement.depositor.call{value: address(this).balance}("");
        require(success, "transfer failed");
        emit FundsWithdrawn(_msgSender(), address(this).balance);
        _pause();
    }

    /**
     * @dev Lock funds. The depositor can call this function to lock the funds after the deadline.
     * @notice Only the depositor can call this function when the status is Active.
     * @notice It changes the status to Locked and emits a FundsLocked event.
     */
    function lockFunds() external onlyDepositor inStatus(Status.Active) {
        require(block.timestamp >= _agreement.deadlineDate &&
            block.timestamp < _agreement.deadlineDate + RELEASE_FUNDS_AFTER_DEADLINE, 
            "can be locked after deadline during 3 days");
        _agreement.status = Status.Locked;
        emit FundsLocked();
    }

    /**
     * @dev Set multisig address. The beneficiary can call this function to set the multisig address for dispute resolution.
     * @param multisig The address of the multisig contract.
     * @notice Only the beneficiary can call this function when the status is Locked.
     * @notice It requires that the multisig address is not zero and emits a MultisigSet event.
     * @notice The multisig address must be set before the depositor approves it.
     * @notice It also possible to set an arbitrator address instead of multisig.
     */
    function setMultisig(address multisig) external 
            onlyBeneficiary checkAddress(multisig) inStatus(Status.Locked) {
        _agreement.multisig = multisig;
        emit MultisigSet(multisig);
    }

    /**
     * @dev Approve multisig address. The depositor can call this function to approve the multisig address set by the beneficiary.
     * @notice Only the depositor can call this function when the status is Locked.
     * @notice It requires that the multisig address is set and emits a MultisigApproved event.
     * @notice It also possible to approve an arbitrator address instead of multisig.
     */
    function approveMultisig() external 
            onlyDepositor inStatus(Status.Locked) {
        require(_agreement.multisig != address(0), "multisig not set");
        _agreement.approved = true;
        emit MultisigApproved(_agreement.multisig);
    }

    /**
     * @dev Compensate agreement. The multisig can call this function to compensate the agreement.
     * @param amount The amount to compensate to the depositor.
     * @notice Only the multisig can call this function when the status is Locked.
     * @notice It changes the status to Closed and emits a FundsCompensated event.
     */
    function compensateAgreement(uint256 amount) external payable 
            onlyMultisig inStatus(Status.Locked) nonReentrant {
        require(address(this).balance >= amount, "not enough funds");
        _agreement.status = Status.Closed;
        if (amount != 0) {
            (bool success, ) =  _agreement.depositor.call{value: amount}("");
            require(success, "transfer failed");
        }
        emit FundsCompensated(amount);
        if (address(this).balance == 0) {
            _pause();
        }
    }
    
    /**
     * @dev Get agreement details. This function returns the details of the agreement.
     * @return The balance of the contract, start date, deadline date, status, multisig address, and approval status.
     * @notice Only the depositor or beneficiary can call this function.
     */
    function getAgreementDetails() external view 
            onlyDepositorOrBeneficiary returns (uint256, uint256, uint256, Status, address, address, address, bool) {
        return (address(this).balance, _agreement.startDate, _agreement.deadlineDate, 
            _agreement.status, _agreement.depositor, _agreement.beneficiary, _agreement.multisig, _agreement.approved);
    }

    /**
     * @dev Get the status of the agreement.
     * @return The current status of the agreement.
     * @notice This function can be called by anyone to check the status of the agreement.
     */
    function getAgreementStatus() external view returns (Status) {
        return _agreement.status;
    }

    /**
     * @dev Pause the contract. This function can be called by the depositor when the agreement is in a final state.
     * @notice The contract can only be paused if there are no funds left in it.
     * @notice It changes the status to Paused and emits a Paused event.
     */
    function pause() onlyDepositor whenNotPaused external {
        require(_agreement.status == Status.Revoked ||
                _agreement.status == Status.Rejected ||
                _agreement.status == Status.Refunded ||
                _agreement.status == Status.Closed,
            "must be in final state");
        require (address(this).balance == 0, "withdraw funds to pause");
        _pause();
    }

    /**
     * @dev Create a new agreement. This function allows the depositor to create a new agreement and reuse current contract after it was paused.
     * @param beneficiary The address of the beneficiary who will receive the funds.
     * @param deadlineDate The deadline date for the agreement in Unix timestamp format.
     * @notice Only the depositor can call this function when the contract is paused.
     * @notice It emits an AgreementCreated event.
     */
    function createAgreement(
        address payable beneficiary,
        uint32 deadlineDate
    ) external payable onlyDepositor whenPaused checkAddress(beneficiary) {
        _agreement.beneficiary = beneficiary;
        _agreement.deadlineDate = deadlineDate;
        _agreement.startDate = uint32(block.timestamp);
        _agreement.status = Status.Funded;
        _agreement.multisig = address(0);
        _agreement.approved = false;
        emit AgreementCreated(_msgSender(), beneficiary, uint96(msg.value), deadlineDate);
    }
} 