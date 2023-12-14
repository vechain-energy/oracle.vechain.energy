// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @dev Interface for IVechainEnergyOracleV1
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
}

/**
 * @dev Contract to consume data from IVechainEnergyOracleV1
 */
contract OracleConsumer {
    /**
     * @dev Instance of IVechainEnergyOracleV1 on TestNet
     */
    IVechainEnergyOracleV1 Oracle =
        IVechainEnergyOracleV1(0x12E3582D7ca22234f39D2A7BE12C98ea9c077E25);

    /**
     * @dev Pre-calculated feed id from a string
     */
    bytes32 feedId = bytes32(abi.encodePacked("vet-usd"));

    /**
     * @dev Access the value and return it as uint256
     * @return usdPrice The current USD price of VET
     */
    function usdPriceVet() public view returns (uint256 usdPrice) {
        (uint128 value, ) = Oracle.getLatestValue(feedId);

        // simply adds some digits
        usdPrice = uint256(value) * 1e6;
    }

    /**
     * @dev Another example that returns a single cent value
     * @return usdPriceCents The current USD price of VET in cents
     */
    function usdPriceCentsVet() public view returns (uint32 usdPriceCents) {
        (uint128 value, ) = Oracle.getLatestValue(feedId);

        usdPriceCents = uint32((value + 5e9) / 1e10); // Add 5e9 for rounding
    }

    /**
     * @dev A sample check to verify the age of the data
     * @return isNewer Boolean indicating if the price is newer than an hour
     */
    function priceIsNewerThanHour() public view returns (bool isNewer) {
        (, uint128 updatedAt) = Oracle.getLatestValue(feedId);

        isNewer = (block.timestamp - updatedAt) < 1 hours;
    }
}
