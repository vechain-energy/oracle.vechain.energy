# Oracle / Data Feed for Vechain

There are two different contracts available, one that uses OpenZeppelins role management and is upgradable. The second one is simplified to use less gas (25% per update) in the long run.

## Contract Details

**Data Storage & Retrieval**

- Each data feed is identified by a unique bytes32 identifier.
- Each feed stores the most recent value and the timestamp of the update, which can be accessed using the identifier.

```sol
function updateValue(bytes32 id, uint128 newValue, uint128 newTimestamp)
```

- A view function is available to return the value and timestamp for further processing.

```sol
function getLatestValue(bytes32 id) public view returns (uint128 value, uint128 updatedAt)
```

## How to Build & Test

```shell
cd contracts
yarn install
yarn test
```

### Deployment Instructions

***Oracle Gas Optimized***

This contract is gas optimized and can only have one reporter.

```shell
# For TestNet
PRIVATE_KEY="0x…" NETWORK=vechain yarn deploy OracleGasOptimized

# For MainNet
PRIVATE_KEY="0x…" NETWORK=main yarn deploy OracleGasOptimized
```

After deployment, the ABI and Addresses are archived in the `outputs/` folder.




**Oracle Upgradelabe**

This contract is designed to be upgradable and uses roles for access control.

**Roles Defined**

1. DEFAULT_ADMIN_ROLE: This role can grant and revoke any role.
2. UPGRADE_ROLE: This role is responsible for authorizing contract upgrades.
3. REPORTER_ROLE: This role can set new data values.

**Data Storage & Retrieval**

- Each data feed is identified by a unique bytes32 identifier.
- Each feed stores the most recent value and the timestamp of the update, which can be accessed using the identifier.
- Only users with the REPORTER_ROLE can update the data.

```sol
function updateValue(bytes32 id, uint256 newValue, uint64 newTimestamp)
```

- A view function is available to return the value and timestamp for further processing.

```sol
function getLatestValue(bytes32 id) public view returns (uint256 value, uint64 updatedAt)
```

```shell
# For TestNet
PRIVATE_KEY="0x…" NETWORK=vechain yarn deploy:proxy OracleUpgradeable

# For MainNet
PRIVATE_KEY="0x…" NETWORK=main yarn deploy:proxy OracleUpgradeable
```

After deployment, the ABI and Addresses are archived in the `outputs/` folder.

**Upgrades**

```shell
PRIVATE_KEY="0x…" NETWORK=vechain yarn deploy:upgrade OracleUpgradeable
```
