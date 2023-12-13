// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./utils/SignatureVerifier.sol";

contract OracleCCIP {
    address oracleSigner = 0x56cB0E0276AD689Cc68954D47460cD70f46244DC;
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
        require(signer == oracleSigner, "SignatureVerifier: Invalid sigature");
        (value, updatedAt) = abi.decode(result, (uint128, uint128));
        feedId = bytes32(extraData);
    }
}
