// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./utils/SignatureVerifier.sol";

interface VechainEnergyOracleV1 {
    function isReporter(address user) external view returns (bool);
}

contract OracleCCIP {
    VechainEnergyOracleV1 Oracle =
        VechainEnergyOracleV1(0x12E3582D7ca22234f39D2A7BE12C98ea9c077E25);

    string oracleUrl = "http://localhost:8787/vet-usd/signed";

    error InvalidOperation();
    error OffchainLookup(
        address sender,
        string[] urls,
        bytes callData,
        bytes4 callbackFunction,
        bytes extraData
    );

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
     * Callback used by CCIP read compatible clients to verify and parse the response.
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
