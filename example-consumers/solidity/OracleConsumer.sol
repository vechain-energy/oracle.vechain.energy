// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface VechainEnergyOracleV1 {
    function getLatestValue(
        bytes32 id
    ) external view returns (uint128 value, uint128 updatedAt);
}

contract OracleConsumer {
    // TestNet-Address
    VechainEnergyOracleV1 Oracle =
        VechainEnergyOracleV1(0x12E3582D7ca22234f39D2A7BE12C98ea9c077E25);

    // pre-calculate the feed id from a strin
    bytes32 feedId = bytes32(abi.encodePacked("vet-usd"));

    // access the value and return it as uint256
    // the result can be used with formatEther(usd) to get the current human readable value
    function usdPriceVet() public view returns (uint256 usdPrice) {
        (uint128 value, ) = Oracle.getLatestValue(feedId);

        // simply adds some digits
        usdPrice = uint256(value) * 1e6;
    }

    // another example that returns a single cent value
    function usdPriceCentsVet() public view returns (uint32 usdPriceCents) {
        (uint128 value, ) = Oracle.getLatestValue(feedId);

        usdPriceCents = uint32((value + 5e9) / 1e10); // Add 5e9 for rounding
    }

    // a sample check to verify the age of the data
    // example use case is a revert with OffchainLookup, if its too old
    function priceIsNewerThanHour() public view returns (bool isNewer) {
        (, uint128 updatedAt) = Oracle.getLatestValue(feedId);

        isNewer = (block.timestamp - updatedAt) < 1 hours;
    }
}
