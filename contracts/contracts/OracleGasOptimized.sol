// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./utils/SignatureVerifier.sol";

contract OracleGasOptimized {
    mapping(bytes32 => uint256) internal values;
    address reporter;

    event ValueUpdate(bytes32 id, uint128 value, uint128 updatedAt);
    event ReporterUpdate(address newUpdater);

    constructor() {
        reporter = msg.sender;
    }

    function updateValue(bytes32 id, uint128 value, uint128 timestamp) public {
        require(msg.sender == reporter);
        _updateValue(id, value, timestamp);
    }

    function getLatestValue(
        bytes32 id
    ) public view returns (uint128 value, uint128 updatedAt) {
        updatedAt = (uint128)(values[id] % 2 ** 128);
        value = (uint128)(values[id] >> 128);
    }

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

    function isReporter(address user) public view returns (bool) {
        return user == reporter;
    }

    function _updateValue(
        bytes32 id,
        uint128 value,
        uint128 timestamp
    ) internal {
        values[id] = (((uint256)(value)) << 128) + timestamp;
        emit ValueUpdate(id, value, timestamp);
    }

    function updateReporter(address newReporter) public {
        require(msg.sender == reporter);
        reporter = newReporter;
        emit ReporterUpdate(newReporter);
    }
}
