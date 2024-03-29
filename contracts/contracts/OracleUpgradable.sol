// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";
import "./utils/SignatureVerifier.sol";

/**
 * @title OracleUpgradable
 * @dev This contract is used to manage and update oracle values
 */
contract OracleUpgradable is
    Initializable,
    UUPSUpgradeable,
    AccessControlEnumerableUpgradeable
{
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant REPORTER_ROLE = keccak256("REPORTER_ROLE");
    uint256 private _selectedNextReporter;

    /**
     * @dev Struct to hold the feed value
     */
    struct Report {
        uint128 value;
        uint128 updatedAt;
    }

    /**
     * @dev The mapping of data feed ids to values
     */
    mapping(bytes32 => Report) private _feed;

    /**
     * @dev Emitted when a value is changed.
     */
    event ValueUpdate(bytes32 id, uint128 value, uint128 updatedAt);

    /**
     * @dev Constructor to disable initializers
     */
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Function to initialize the contract
     */
    function initialize() public initializer {
        __AccessControlEnumerable_init();
        __UUPSUpgradeable_init();

        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(UPGRADER_ROLE, msg.sender);
        _setupRole(REPORTER_ROLE, msg.sender);
    }

    /**
     * @dev Function to update the value of a given id. Restricted to REPORTER_ROLE.
     * @param id The id for the value to update
     * @param newValue The new value
     * @param newTimestamp The timestamp of the new value
     */
    function updateValue(
        bytes32 id,
        uint128 newValue,
        uint128 newTimestamp
    ) public onlyRole(REPORTER_ROLE) {
        _updateValue(id, newValue, newTimestamp);
        _selectRandomReporter();
    }

    /**
     * @dev Function to get the latest value and its timestamp for a given id
     * @param id The id to retrieve the value for
     * @return value The latest value
     * @return updatedAt The timestamp of the latest value
     */
    function getLatestValue(
        bytes32 id
    ) public view returns (uint128 value, uint128 updatedAt) {
        return (_feed[id].value, _feed[id].updatedAt);
    }

    /**
     * @dev Function to update the value of a given id with a signed message
     * @param message The signed message
     * @param extraData Extra data to verify the signature, only relevant to the calling contract.
     * @param signedFor The address the message was signed for
     */
    function updateValueWithProof(
        bytes calldata message,
        bytes calldata extraData,
        address signedFor
    ) external {
        (address signer, bytes memory result) = SignatureVerifier.verify(
            signedFor,
            extraData,
            message
        );

        require(isReporter(signer), "Oracle: Invalid signature");
        (uint128 newValue, uint128 newTimestamp, bytes32 feedId) = abi.decode(
            result,
            (uint128, uint128, bytes32)
        );
        (, uint128 oldTimestamp) = getLatestValue(feedId);
        require(newTimestamp > oldTimestamp, "Oracle: Data must be newer");
        require(
            newTimestamp < (block.timestamp + 30 minutes),
            "Oracle: Data can not be in future"
        );
        _updateValue(feedId, newValue, newTimestamp);
    }

    /**
     * @dev Internal function to update the value for a given id. Emits a ValueUpdate event.
     * @param id The id for the value to update
     * @param newValue The new value
     * @param newTimestamp The timestamp of the new value
     */
    function _updateValue(
        bytes32 id,
        uint128 newValue,
        uint128 newTimestamp
    ) internal {
        _feed[id] = Report(newValue, newTimestamp);
        emit ValueUpdate(id, newValue, newTimestamp);
    }

    /**
     * @dev Function to check if a given address is the reporter
     * @param user The address to check
     * @return bool true if the given address is the reporter, false otherwise
     */
    function isReporter(address user) public view returns (bool) {
        return hasRole(REPORTER_ROLE, user);
    }

    /**
     * @dev Get the preferred reporter address for the next data update.
     * @return reporter The address of the who should publish data next.
     */
    function getPreferredReporter() public view returns (address reporter) {
        return getRoleMember(REPORTER_ROLE, _selectedNextReporter);
    }

    /**
     * @dev Randomly select a reporter that is preferred for next reporting.
     */
    function _selectRandomReporter() internal {
        uint reporterCount = getRoleMemberCount(REPORTER_ROLE);
        uint256 newReporterIndex = uint256(
            keccak256(
                abi.encodePacked(
                    block.timestamp,
                    blockhash(block.number - 1),
                    _selectedNextReporter
                )
            )
        ) % reporterCount;
        // Ensure the index is changed, if the new calculated index is the same as before, increment and ensure bounds are kept
        if (newReporterIndex == _selectedNextReporter) {
            newReporterIndex = (newReporterIndex + 1) % reporterCount;
        }
        _selectedNextReporter = newReporterIndex;
    }

    /**
     * @dev Function to authorize an upgrade. Restricted to UPGRADER_ROLE.
     * @param newImplementation The address of the new implementation
     */
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyRole(UPGRADER_ROLE) {}
}
