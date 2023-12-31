// SPDX-License-Identifier: MIT
// !! THIS FILE WAS AUTOGENERATED BY abi-to-sol v0.6.6. !!
pragma solidity >=0.7.0 <0.9.0;

interface IVechainEnergyOracleV1 {
    event ReporterUpdate(address newUpdater);
    event ValueUpdate(bytes32 id, uint128 value, uint128 updatedAt);

    function getLatestValue(
        bytes32 id
    ) external view returns (uint128 value, uint128 updatedAt);

    function isReporter(address user) external view returns (bool);

    function updateReporter(address newReporter) external;

    function updateValue(bytes32 id, uint128 value, uint128 timestamp) external;

    function updateValueWithProof(
        bytes memory message,
        bytes memory extraData,
        address signedFor
    ) external;
}
