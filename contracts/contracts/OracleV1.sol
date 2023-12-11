// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

/// @custom:security-contact security@builder.eco
contract OracleV1 is
    Initializable,
    UUPSUpgradeable,
    AccessControlUpgradeable
{
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant REPORTER_ROLE = keccak256("REPORTER_ROLE");

    struct TokenData {
        uint256 value;
        uint64 updatedAt;
    }

    mapping(bytes32 => TokenData) tokenOracles;

    event ValueUpdate(bytes32 id, uint256 value, uint64 updatedAt);

    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(UPGRADER_ROLE, msg.sender);
        _setupRole(REPORTER_ROLE, msg.sender);
    }

    function updateValue(
        bytes32 id,
        uint256 newValue,
        uint64 newTimestamp
    ) public onlyRole(REPORTER_ROLE) {
        tokenOracles[id] = TokenData(newValue, newTimestamp);
        emit ValueUpdate(id, newValue, newTimestamp);
    }

    function getLatestValue(
        bytes32 id
    ) public view returns (uint256 value, uint64 updatedAt) {
        require(tokenOracles[id].updatedAt > 0, "invalid id");
        return (tokenOracles[id].value, tokenOracles[id].updatedAt);
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyRole(UPGRADER_ROLE) {}
}