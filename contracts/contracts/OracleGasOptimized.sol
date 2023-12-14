// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./utils/SignatureVerifier.sol";

/**
 * @title OracleGasOptimized
 * @dev This contract is optimized to use less gas during updates
 */
contract OracleGasOptimized {
    /**
     * @dev Mapping of data feed ids to values
     */
    mapping(bytes32 => uint256) private feed;

    /**
     * @dev Emitted when a value is changed.
     */
    event ValueUpdate(bytes32 id, uint128 value, uint128 updatedAt);

    /**
     * @dev The address allowed to submit new values
     */
    address private reporter;
    event ReporterUpdate(address newUpdater);

    /**
     * @dev Sets the initial reporter to the contract deployer.
     */
    constructor() {
        reporter = msg.sender;
    }

    /**
     * @dev Updates the value for a given id. Only the reporter can call this function.
     * @param id The id for the value to update.
     * @param value The new value.
     * @param timestamp The timestamp of the new value.
     */
    function updateValue(bytes32 id, uint128 value, uint128 timestamp) public {
        require(msg.sender == reporter);
        _updateValue(id, value, timestamp);
    }

    /**
     * @dev Returns the latest value and its timestamp for a given id.
     * @param id The id to retrieve the value for.
     * @return value The latest value.
     * @return updatedAt The timestamp of the latest value.
     */
    function getLatestValue(
        bytes32 id
    ) public view returns (uint128 value, uint128 updatedAt) {
        updatedAt = (uint128)(feed[id] % 2 ** 128);
        value = (uint128)(feed[id] >> 128);
    }

    /**
     * @dev Updates the value for a given id using a signed message. The signature must be valid and the signer must be the reporter.
     * @param message The signed message.
     * @param extraData Extra data to verify the signature.
     * @param signedFor The address the message was signed for.
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
        _updateValue(feedId, newValue, newTimestamp);
    }

    /**
     * @dev Internal function to update the value for a given id. Emits a ValueUpdate event.
     * @param id The id for the value to update.
     * @param value The new value.
     * @param timestamp The timestamp of the new value.
     */
    function _updateValue(
        bytes32 id,
        uint128 value,
        uint128 timestamp
    ) internal {
        feed[id] = (((uint256)(value)) << 128) + timestamp;
        emit ValueUpdate(id, value, timestamp);
    }

    /**
     * @dev Updates the reporter. Only the current reporter can call this function.
     * @param newReporter The new reporter.
     */
    function updateReporter(address newReporter) public {
        require(msg.sender == reporter);
        reporter = newReporter;
        emit ReporterUpdate(newReporter);
    }

    /**
     * @dev Checks if a given address is the reporter.
     * @param user The address to check.
     * @return bool true if the given address is the reporter, false otherwise.
     */
    function isReporter(address user) public view returns (bool) {
        return user == reporter;
    }
}
