// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

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
        values[id] = (((uint256)(value)) << 128) + timestamp;
        emit ValueUpdate(id, value, timestamp);
    }

    function getLatestValue(
        bytes32 id
    ) external view returns (uint128 value, uint128 updatedAt) {
        updatedAt = (uint128)(values[id] % 2 ** 128);
        value = (uint128)(values[id] >> 128);
    }

    function updateOracleUpdaterAddress(
        address newOracleUpdaterAddress
    ) public {
        require(msg.sender == oracleUpdater);
        oracleUpdater = newOracleUpdaterAddress;
        emit UpdaterAddressChange(newOracleUpdaterAddress);
    }
}
