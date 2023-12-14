// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./utils/SignatureVerifier.sol";

/**
 * @dev Update a data feed with the signed proof from the reporter backend
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

interface IVechainEnergyOracleV1 {
    /**
     * @dev Get the latest value of a data feed
     * @param id The ID of the data feed
     * @return value The latest value of the data feed
     * @return updatedAt The timestamp of the last update
     */
    function getLatestValue(
        bytes32 id
    ) external view returns (uint128 value, uint128 updatedAt);

    /**
     * @dev Update the value of a data feed with a signed proof
     * @param message The signed proof
     * @param extraData Extra data
     * @param signedFor The address the proof is signed for
     */
    function updateValueWithProof(
        bytes calldata message,
        bytes calldata extraData,
        address signedFor
    ) external;

    /**
     * @dev Check if a user is a reporter
     * @param user The address of the user
     * @return A boolean indicating if the user is a reporter
     */
    function isReporter(address user) external view returns (bool);
}

/**
 * @dev Contract to update a data feed with a signed proof
 */
contract OraclePublicUpdater {
    /**
     * @dev Instance of IVechainEnergyOracleV1 on TestNet
     */
    IVechainEnergyOracleV1 Oracle =
        IVechainEnergyOracleV1(0x12E3582D7ca22234f39D2A7BE12C98ea9c077E25);

    /**
     * @dev With the signed response from `/feed-id/signed`
     * the feed can be updated by anyone who volunteers to pay the gas fees
     * @param response The signed response
     * @param extraData Extra data
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
        // for example skip update when new enough but update when older than needed in a minting process
        if (newTimestamp > oldTimestamp) {
            Oracle.updateValueWithProof(response, extraData, address(this));
        }
    }
}
