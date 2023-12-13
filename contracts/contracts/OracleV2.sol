// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./utils/SignatureVerifier.sol";

contract OracleV2 {
    mapping(bytes32 => uint256) public values;
    address oracleUpdater;

    event ValueUpdate(bytes32 id, uint128 value, uint128 updatedAt);
    event UpdaterAddressChange(address newUpdater);

    constructor() {
        oracleUpdater = msg.sender;
    }

    function updateValue(bytes32 id, uint128 value, uint128 timestamp) public {
        require(msg.sender == oracleUpdater);
        _updateValue(id, value, timestamp);
    }

    function getLatestValue(
        bytes32 id
    ) public view returns (uint128 value, uint128 updatedAt) {
        updatedAt = (uint128)(values[id] % 2 ** 128);
        value = (uint128)(values[id] >> 128);
    }

    function updateValuePublic(bytes calldata message, bytes calldata feedId) public {
        (address signer, bytes memory result) = SignatureVerifier.verify(
            oracleUpdater,
            feedId,
            message
        );

        require(signer == oracleUpdater, "SignatureVerifier: Invalid sigature");
        (uint128 newValue, uint128 newTimestamp) = abi.decode(
            result,
            (uint128, uint128)
        );
        (, uint128 oldTimestamp) = getLatestValue(bytes32(feedId));
        require(newTimestamp > oldTimestamp, "new data must be newer");
        _updateValue(bytes32(feedId), newValue, newTimestamp);
    }

    function _updateValue(
        bytes32 id,
        uint128 value,
        uint128 timestamp
    ) internal {
        values[id] = (((uint256)(value)) << 128) + timestamp;
        emit ValueUpdate(id, value, timestamp);
    }

    function updateOracleUpdaterAddress(
        address newOracleUpdaterAddress
    ) public {
        require(msg.sender == oracleUpdater);
        oracleUpdater = newOracleUpdaterAddress;
        emit UpdaterAddressChange(newOracleUpdaterAddress);
    }
}
