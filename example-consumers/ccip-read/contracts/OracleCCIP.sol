// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./utils/SignatureVerifier.sol";

/**
 * @dev Interface for IVechainEnergyOracleV1
 */
interface IVechainEnergyOracleV1 {
    function isReporter(address user) external view returns (bool);
}

/**
 * @dev Example contract to show process for off-chain-data-retrieval
 */
contract OracleCCIP {
    /**
     * @dev Instance of IVechainEnergyOracleV1 on TestNet
     */
    IVechainEnergyOracleV1 Oracle =
        IVechainEnergyOracleV1(0x12E3582D7ca22234f39D2A7BE12C98ea9c077E25);

    /**
     * @dev URL of the oracle
     */
    string oracleUrl = "http://localhost:8787/vet-usd/resolver";

    /**
     * @dev Error thrown for invalid operations
     */
    error InvalidOperation();
    /**
     * @dev Error thrown for offchain lookup
     */
    error OffchainLookup(
        address sender,
        string[] urls,
        bytes callData,
        bytes4 callbackFunction,
        bytes extraData
    );

    /**
     * @dev Function to get the USD price of VET. Triggers an error that is handled on the client side.
     */
    function usdPriceVet() external view {
        string[] memory urls = new string[](1);
        urls[0] = oracleUrl;

        bytes memory feedId = bytes(abi.encodePacked("vet-usd"));
        revert OffchainLookup(
            address(this),
            urls,
            feedId,
            this.usdPriceVetWithProof.selector,
            feedId
        );
    }

    /**
     * @dev Callback used by CCIP read compatible clients that receives the signed backend response.
     * @return value The USD price of VET.
     * @return updatedAt The timestamp of the last update.
     * @return feedId The feed ID of the data.
     */
    function usdPriceVetWithProof(
        bytes calldata response,
        bytes calldata extraData
    ) public view returns (uint128 value, uint128 updatedAt, bytes32 feedId) {
        (address signer, bytes memory result) = SignatureVerifier.verify(
            address(this),
            extraData,
            response
        );
        require(Oracle.isReporter(signer), "Oracle: Invalid signature");
        (value, updatedAt, feedId) = abi.decode(
            result,
            (uint128, uint128, bytes32)
        );
    }
}
