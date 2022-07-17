// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.12;

/*
 * Import NPM libraries for Ownable & AccessControl functionality
 */
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CBSC is Ownable, AccessControl {
    /*
     * State management Structs and Mappings
     */

    struct Commitment {
        string state;
    }

    struct Fluent {
        uint256 commitment_id;
        bool atomic;
        uint256 value;
        uint256 balance;
        uint256 terms; 
        uint256 start;
        uint256 end;
    }

    mapping(uint256 => Commitment) commitments;
    mapping(uint256 => Fluent) fluents;

    /*
     * Set debtor and creditor role
     */
    bytes32 public constant debtor_ROLE = keccak256("debtor_ROLE");
    bytes32 public constant creditor_ROLE = keccak256("creditor_ROLE");

    /*
     * Setup and store initial roles on the ledger
     */
    function setupRoles(address debtor, address creditor) external {
        _setupRole(debtor_ROLE, debtor);
        _setupRole(creditor_ROLE, creditor);
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /*
     * Grant debtor role to xz
     */
    function grantDebtorRole(address debtor) external {
        grantRole(debtor_ROLE, debtor);
    }

    /*
     * Grant creditor role to xy
     */
    function grantCreditorRole(address creditor) external {
        grantRole(creditor_ROLE, creditor);
    }

    /*
     * Revoke debtor role
     */
    function revokeDebtorRole(address debtor) external {
        revokeRole(debtor_ROLE, debtor);
    }

    /*
     * Revoke creditor role
     */
    function revokeCreditorRole(address creditor) external {
        revokeRole(creditor_ROLE, creditor);
    }

    /*
     * Modifiers
     */

    /*
     * modifier to verify if debtor is allowed to perform action
     */
    modifier onlyDebtor(address debtor) {
        require(hasRole(debtor_ROLE, debtor), "Caller is not a debtor");
        _;
    }

    modifier onlyCreditor(address creditor) {
        require(hasRole(creditor_ROLE, creditor), "Caller is not an creditor");
        _;
    }

    /*
     * Modifier to verify that a commitment is created
     */
    modifier commitmentIsCommitted(uint256 _commitment_id) {
        require(
            keccak256(abi.encodePacked(commitments[_commitment_id].state)) ==
                keccak256(abi.encodePacked("commit")),
            "Modifier commitmentIsCommitted failed"
        );
        _;
    }

    //   /*
    //   * Modifier to verify if a commitment is activated
    //   */
    modifier commitmentIsActivated(uint256 _commitment_id) {
        require(
            keccak256(abi.encodePacked(commitments[_commitment_id].state)) ==
                keccak256(abi.encodePacked("activate")),
            "Modifier commitmentIsActivated failed"
        );
        _;
    }

    //   /*
    //   * Modifier to verify that if partial fulfilment is allowed for q
    //   */
    modifier partialFulfilmentIsAllowed(uint256 _fluent_id) {
        require(
            fluents[_fluent_id].atomic == false,
            "Modifier partialFulfilmentIsAllowed failed"
        );
        _;
    }

    /*
     * Modifier to verify that a the operation is Considered
     */
    modifier operationIsConsider(string memory _operation) {
        require(
            keccak256(abi.encodePacked(_operation)) ==
                keccak256(abi.encodePacked("consider")),
            "Modifier operationIsConsidered failed"
        );
        _;
    }

    /*
     * Modifier to verify that a the operation is Confirmed
     */
    modifier operationIsStart(string memory _operation) {
        require(
            keccak256(abi.encodePacked(_operation)) ==
                keccak256(abi.encodePacked("start")),
            "Modifier operationIsConsidered failed"
        );
        _;
    }

    /*
     * Modifier to verify that a the operation is Fulfilled
     */
    modifier operationIsFulfill(string memory _operation) {
        require(
            keccak256(abi.encodePacked(_operation)) ==
                keccak256(abi.encodePacked("fulfill")),
            "Modifier operationIsConsidered failed"
        );
        _;
    }

    /*
     * Modifier to verify that a the operation is Delegated
     */
    modifier operationIsDelegate(string memory _operation) {
        require(
            keccak256(abi.encodePacked(_operation)) ==
                keccak256(abi.encodePacked("delegate")),
            "Modifier operationIsDelegate failed"
        );
        _;
    }

    /*
     * Modifier to verify that a the operation is Assigned
     */
    modifier operationIsAssign(string memory _operation) {
        require(
            keccak256(abi.encodePacked(_operation)) ==
                keccak256(abi.encodePacked("assign")),
            "Modifier operationIsAssign failed"
        );
        _;
    }

    /*
     * Modifier to verify that a the operation is Assigned
     */
    modifier fulfillmentIsNotEarly(uint256 _start, uint256 _time) {
        require(
            keccak256(abi.encodePacked(_time)) >=
                keccak256(abi.encodePacked(_start)),
            "Modifier fulfillmentIsNotEarly failed"
        );
        _;
    }

    /*
     * Modifier to verify that a the operation is Assigned
     */
    modifier fulfillmentIsNotLate(uint256 _end, uint256 _time) {
        require(
            keccak256(abi.encodePacked(_time)) <=
                keccak256(abi.encodePacked(_end)),
            "Modifier fulfillmentIsNotLate failed"
        );
        _;
    }

    function commit(
        uint256 _commitment_id,
        string memory _operation,
        address _debtor,
        uint256 _fluent_id,
        uint256 _value,
        bool _atomic,
        uint256 _start,
        uint256 _end
    ) external onlyDebtor(_debtor) operationIsConsider(_operation) {
        commitments[_commitment_id].state = "commit";
        fluents[_fluent_id].commitment_id = _commitment_id;
        fluents[_fluent_id].value = _value;
        fluents[_fluent_id].balance = _value;
        fluents[_fluent_id].atomic = _atomic;
        fluents[_fluent_id].start = _start;
        fluents[_fluent_id].end = _end;
        emit StateLog(_commitment_id, commitments[_commitment_id].state);
    }

    function activate(
        uint256 _commitment_id,
        string memory _operation,
        address _debtor,
        uint256 _fluent_id,
        uint256 _value,
        bool _atomic,
        uint256 _start,
        uint256 _end
    ) external onlyDebtor(_debtor) operationIsStart(_operation) {
        commitments[_commitment_id].state = "activate";
        fluents[_fluent_id].value = _value;
        fluents[_fluent_id].balance = _value;
        fluents[_fluent_id].atomic = _atomic;
        fluents[_fluent_id].start = _start;
        fluents[_fluent_id].end = _end;
        emit StateLog(_commitment_id, commitments[_commitment_id].state);
    }

    function satisfy(
        uint256 _fluent_id,
        uint256 _commitment_id,
        string memory _operation,
        uint256 _time
    )
        external
        commitmentIsActivated(_commitment_id)
        operationIsFulfill(_operation)
        fulfillmentIsNotEarly(fluents[_fluent_id].start, _time)
        fulfillmentIsNotLate(fluents[_fluent_id].end, _time)
    {
        commitments[_commitment_id].state = "satisfy";
        emit StateLog(_commitment_id, commitments[_commitment_id].state);
    }

    function partialSatisfy(
        uint256 _fluent_id,
        uint256 _commitment_id,
        uint256 _value,
        string memory _operation,
        uint256 _time
    )
        external
        commitmentIsActivated(_commitment_id)
        operationIsFulfill(_operation)
        fulfillmentIsNotEarly(fluents[_fluent_id].start, _time)
        fulfillmentIsNotLate(fluents[_fluent_id].end, _time)
        partialFulfilmentIsAllowed(_fluent_id)
    {
        fluents[_fluent_id].balance = fluents[_fluent_id].balance - _value;
        emit StateLog(_commitment_id, commitments[_commitment_id].state);
    }

    function cancel(
        address _debtor,
        uint256 _commitment_id,
        string memory _operation
    )
        external
        onlyDebtor(_debtor)
        commitmentIsCommitted(_commitment_id)
        operationIsDelegate(_operation)
    {
        commitments[_commitment_id].state = "cancel";
        emit StateLog(_commitment_id, commitments[_commitment_id].state);
    }

    function release(
        address _creditor,
        uint256 _commitment_id,
        string memory _operation
    )
        external
        onlyCreditor(_creditor)
        commitmentIsCommitted(_commitment_id)
        operationIsAssign(_operation)
    {
        commitments[_commitment_id].state = "release";
        emit StateLog(_commitment_id, commitments[_commitment_id].state);
    }

    /*
     * Trigger event to notify listeners that the state of a single commitment is requested
     */
    event StateLog(uint256 id, string state);
}
