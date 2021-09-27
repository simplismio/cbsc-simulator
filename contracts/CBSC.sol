// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

/*
 * Import NPM libraries for Ownable & AccessControl functionality
 */
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CBSC is Ownable, AccessControl {
    /*
     *  Rules of engagement (ROE)
     *  - Struct definitionnops
     *  - Arrays to store the struct objects in order to work with initiated commitments, events and fluents
     *  - Permissions
     */

    struct Commitment {
        address buyer;
        address seller;
        string state;
    }

    struct Fluent {
        uint256 commitment_id;
        uint256 value;
        uint256 balance;
        bool atomic;
    }

    mapping(uint256 => Commitment) commitments;
    mapping(uint256 => Fluent) fluents;

    /*
     * Set buyer and seller role
     */
    bytes32 public constant BUYER_ROLE = keccak256("BUYER_ROLE");
    bytes32 public constant SELLER_ROLE = keccak256("SELLER_ROLE");

    /*
     * Setup and store initial roles on the ledger
     */
    function setupRoles(address buyer, address seller) external {
        _setupRole(BUYER_ROLE, buyer);
        _setupRole(SELLER_ROLE, seller);
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /*
     * Grant buyer role to xz
     */
    function grantbuyerRole(address buyer) external {
        grantRole(BUYER_ROLE, buyer);
    }

    /*
     * Grant seller role to xy
     */
    function grantsellerRole(address seller) external {
        grantRole(SELLER_ROLE, seller);
    }

    /*
     * Modifiers
     */

    /*
     * modifier to verify if buyer and seller are allowed to perform action
     */
    modifier onlyBuyer(address buyer) {
        require(hasRole(BUYER_ROLE, buyer), "Caller is not an buyer");
        _;
    }

    modifier onlySeller(address seller) {
        require(hasRole(SELLER_ROLE, seller), "Caller is not an seller");
        _;
    }

    /*
     * Modifier to verify that a commitment is created
     */
    modifier commitmentIsCommitted(uint256 _commitment_id) {
        require(
            keccak256(abi.encodePacked(commitments[_commitment_id].state)) ==
                keccak256(abi.encodePacked("committed")),
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
                keccak256(abi.encodePacked("activated")),
            "Modifier commitmentIsActivated failed"
        );
        _;
    }

    //   /*
    //   * Modifier to verify that if partial fulfilment is allowed for q
    //   */
    modifier partialFulfilmentIsAllowed(uint256 _fluent_id) {
        require(
            fluents[_fluent_id].atomic == true,
            "Modifier partialFulfilmentIsAllowed failed"
        );
        _;
    }

    function commit(
        uint256 _commitment_id,
        address _buyer,
        address _seller,
        uint256 _fluent_id,
        uint256 _value,
        bool _atomic
    ) external onlyBuyer(_buyer) {
        commitments[_commitment_id].state = "committed";
        commitments[_commitment_id].buyer = _buyer;
        commitments[_commitment_id].seller = _seller;
        fluents[_fluent_id].value = _value;
        fluents[_fluent_id].balance = _value;
        fluents[_fluent_id].atomic = _atomic;

        emit StateLog(_commitment_id, commitments[_commitment_id].state);
    }

    function activate(uint256 _commitment_id, address _buyer)
        external
        onlyBuyer(_buyer)
        commitmentIsCommitted(_commitment_id)
    {
        commitments[_commitment_id].state = "activated";
        emit StateLog(_commitment_id, commitments[_commitment_id].state);
    }

    function satisfy(
        uint256 _fluent_id,
        uint256 _commitment_id,
        uint256 _value
    ) external commitmentIsActivated(_commitment_id) {
        if (fluents[_fluent_id].balance == _value) {
            commitments[_commitment_id].state = "satisfied";
            emit StateLog(_commitment_id, commitments[_commitment_id].state);
        } else {
            partiallySatisfy(_fluent_id, _value);
        }
    }

    function partiallySatisfy(uint256 _fluent_id, uint256 _value)
        internal
        partialFulfilmentIsAllowed(_fluent_id)
    {
        fluents[_fluent_id].value = fluents[_fluent_id].balance - _value;
        commitments[fluents[_fluent_id].commitment_id]
            .state = "partially satisfied";

        emit PartialSatisfactionLog(fluents[_fluent_id].balance);
    }

    function cancel(uint256 _commitment_id)
        external
        commitmentIsCommitted(_commitment_id)
    {
        commitments[_commitment_id].state = "canceled";
        emit StateLog(_commitment_id, commitments[_commitment_id].state);
    }

    function release(uint256 _commitment_id)
        external
        commitmentIsCommitted(_commitment_id)
    {
        commitments[_commitment_id].state = "released";
        emit StateLog(_commitment_id, commitments[_commitment_id].state);
    }

    /*
     * Trigger event to notify listeners that the state of a single commitment is requested
     */
    event StateLog(uint256 id, string state);

    event PartialSatisfactionLog(uint256 balance);
}
