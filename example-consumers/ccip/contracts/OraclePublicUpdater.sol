// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./utils/SignatureVerifier.sol";

/**
 * Update a data feed with the signed proof from the reporter backend
 * the Oracle will ensure that only correct and newer data is stored
 *
 * fetch a signed response from:
 * http://localhost:8787/vet-usd/signed?sender=<OraclePublicUpdater_Address>&data=<feedId as bytes32>
 * (vet-usd in bytes32 is 0x7665742d75736400000000000000000000000000000000000000000000000000)
 * 
 * use the data response and pass it to updateFeedWithProof(data, 0x)
 *
 * implement into your own contracts with other functionality
 */

interface VechainEnergyOracleV1 {
    function getLatestValue(
        bytes32 id
    ) external view returns (uint128 value, uint128 updatedAt);

    function updateValueWithProof(
        bytes calldata message,
        bytes calldata extraData,
        address signedFor
    ) external;

    function isReporter(address user) external view returns (bool);
}

contract OraclePublicUpdater {
    // TestNet-Address
    VechainEnergyOracleV1 Oracle =
        VechainEnergyOracleV1(0x12E3582D7ca22234f39D2A7BE12C98ea9c077E25);

    /**
     * With the signed response from `/feed-id/signed`
     * the feed can be updated by anyone who volunteers to pay the gas fees
     */
    function updateFeedWithProof(
        bytes calldata response,
        bytes calldata extraData
    ) public {
        // verify data before passing it on
        (address signer, bytes memory result) = SignatureVerifier.verify(
            address(this),
            extraData,
            response
        );
        require(Oracle.isReporter(signer), "Oracle: Invalid signature");

        // check for outdated data
        (, uint128 newTimestamp, bytes32 feedId) = abi.decode(
            result,
            (uint128, uint128, bytes32)
        );
        (, uint128 oldTimestamp) = Oracle.getLatestValue(feedId);

        // can implement this into any function already executing within your own contracts
        // or use a require() to specify situations when you are willing to update
        if (newTimestamp > oldTimestamp) {
            Oracle.updateValueWithProof(response, extraData, address(this));
        }
    }
}
