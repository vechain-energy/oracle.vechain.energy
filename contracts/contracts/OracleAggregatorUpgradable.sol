// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "./utils/SignatureVerifier.sol";
import "./IVechainEnergyOracleV1.sol";

/**
 * @title OracleAggregatorUpgradable
 * @dev This contract is used to aggregate values from multiple sources and return a median value.
 */
contract OracleAggregatorUpgradable is
    Initializable,
    UUPSUpgradeable,
    AccessControlUpgradeable
{
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    uint128 public ignoreUpdatesOlderThan;

    /**
     * @dev Struct to hold the feed value
     */
    struct Report {
        uint128 value;
        uint128 updatedAt;
    }

    /**
     * @dev The list of data sources
     */
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;
    EnumerableSetUpgradeable.AddressSet private _sources;

    /**
     * @dev Constructor to disable initializers
     */
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Function to initialize the contract
     */
    function initialize() public initializer {
        __UUPSUpgradeable_init();

        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(UPGRADER_ROLE, msg.sender);
        _setupRole(ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev Function to add a new oracle source. Restricted to ADMIN_ROLE.
     * @param sourceAddress The address for the contract to add
     */
    function addSource(address sourceAddress) public onlyRole(ADMIN_ROLE) {
        _sources.add(sourceAddress);
    }

    /**
     * @dev Function to remove an existing oracle source. Restricted to ADMIN_ROLE.
     * @param sourceAddress The address for the contract to remove
     */
    function removeSource(address sourceAddress) public onlyRole(ADMIN_ROLE) {
        _sources.remove(sourceAddress);
    }

    /**
     * @dev Function to get information if an address is a valid oracle source.
     * @param sourceAddress The address for the contract to test
     */
    function isSource(address sourceAddress) public view returns (bool) {
        return _sources.contains(sourceAddress);
    }

    /**
     * @dev Function to get a list of all oracle sources.
     * @return oracleSources An array of addresses representing all oracle sources
     */
    function sources() public view returns (address[] memory oracleSources) {
        oracleSources = _sources.values();
    }

    /**
     * @dev Function to set a minimum freshness for data values, relative to the current time. A value of 0 disables the filter. Restricted to ADMIN_ROLE.
     */
    function setIgnoreUpdatesOlderThan(
        uint128 _ignoreUpdatesOlderThan
    ) public onlyRole(ADMIN_ROLE) {
        ignoreUpdatesOlderThan = _ignoreUpdatesOlderThan;
    }

    /**
     * @dev Function to get the median value for a given id.
     * @param id The id to retrieve the value for
     * @return value The latest value
     */
    function getLatestValue(
        bytes32 id
    ) public view returns (uint128 value, uint128 updatedAt) {
        Report[] memory reports = loadReportsFromSources(id);
        Report memory median = medianValue(reports);
        return (median.value, median.updatedAt);
    }



    /**
     * @dev This function loads reports from all sources for a given id. It filters out reports that are older than the specified ignoreUpdatesOlderThan value.
     * It then resizes the reports array to only include valid reports and returns it.
     * @param id The id for which to load the reports
     * @return reports An array of valid reports from all sources
     */
    function loadReportsFromSources(
        bytes32 id
    ) private view returns (Report[] memory) {
        address[] memory sources_ = sources();

        uint sourceCount = sources_.length;
        Report[] memory reports = new Report[](sourceCount);

        uint validReportCount = 0;
        uint requiredUpdatedAfter = ignoreUpdatesOlderThan > 0
            ? block.timestamp - ignoreUpdatesOlderThan
            : ignoreUpdatesOlderThan;

        for (uint sourceIndex = 0; sourceIndex < sourceCount; sourceIndex++) {
            (
                uint128 sourceValue,
                uint128 sourceUpdatedAt
            ) = IVechainEnergyOracleV1(sources_[sourceIndex]).getLatestValue(
                    id
                );

            if (sourceUpdatedAt >= requiredUpdatedAfter) {
                reports[validReportCount] = Report(
                    sourceValue,
                    sourceUpdatedAt
                );
                validReportCount++;
            }
        }

        return resizeList(reports, validReportCount);
    }

    /**
     * @notice Resizes a list of reports to a new length.
     * @param reports The list to resize.
     * @return resizedReports The resized list of reports.
     */
    function resizeList(
        Report[] memory reports,
        uint newSize
    ) private pure returns (Report[] memory resizedReports) {
        if (newSize == reports.length) {
            resizedReports = reports;
        } else {
            resizedReports = new Report[](newSize);
            for (uint i = 0; i < newSize; i++) {
                resizedReports[i] = reports[i];
            }
        }
    }

    /**
     * @notice Calculates the median value over any set of reports. Has been adopted from https://github.com/compound-finance/open-oracle/blob/e7a928334e5e454a88eec38e4ee1be5ee3b13f08/contracts/DelFiPrice.sol#L86-L106
     * @param reports The sources to use when calculating the median value
     * @return median The median value over the set of reports
     */
    function medianValue(
        Report[] memory reports
    ) private pure returns (Report memory median) {
        require(reports.length > 0, "sources list must not be empty");

        Report[] memory sortedReports = sort(reports);

        // if length of values is even, get the left and right medians and average them
        // return the newest timestamp of the both
        if (sortedReports.length % 2 == 0) {
            Report memory left = sortedReports[(sortedReports.length / 2) - 1];
            Report memory right = sortedReports[sortedReports.length / 2];

            uint128 sum = left.value + right.value;
            uint128 updatedAt = left.updatedAt > right.updatedAt
                ? left.updatedAt
                : right.updatedAt;
            return Report(uint128(sum / 2), updatedAt);
        } else {
            // if N is odd, just return the median
            return sortedReports[sortedReports.length / 2];
        }
    }

    /**
     * @notice Helper to sort an array of uints
     * @param array Array of integers to sort
     * @return The sorted array of integers
     */
    function sort(
        Report[] memory array
    ) private pure returns (Report[] memory) {
        uint N = array.length;
        for (uint i = 0; i < N; i++) {
            for (uint j = i + 1; j < N; j++) {
                if (array[i].value > array[j].value) {
                    Report memory tmp = array[i];
                    array[i] = array[j];
                    array[j] = tmp;
                }
            }
        }
        return array;
    }

    /**
     * @dev Function to authorize an upgrade. Restricted to UPGRADER_ROLE.
     * @param newImplementation The address of the new implementation
     */
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyRole(UPGRADER_ROLE) {}
}
