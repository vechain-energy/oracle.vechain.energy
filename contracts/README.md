# Oracle / Data Feed for Vechain

We offer two types of contracts. One is upgradable and uses OpenZeppelin's role management. The other is a simplified version that uses less gas (40% less per update) over time.

Both contracts have the same public interface:

```solidity
interface IVechainEnergyOracleV1 {
    // emitted when data changes
    event ValueUpdate(bytes32 id, uint128 value, uint128 updatedAt);

    // access value for a given feed id
    function getLatestValue(bytes32 id) external view returns (uint128 value, uint128 updatedAt);

    // allows everyone to update values using a verified & signed responses from the public API
    function updateValueWithProof(bytes memory message, bytes memory extraData, address signedFor) external;
}
```

- `id` is a byte32 encoded version of the feed identifier (for example `vet-usd`)
- `value` is the value provided by the oracle
- `updatedAt` is the unix timestamp when the value was last determined

To support a decentralized approach, an aggregator contract `OracleAggregatorUpgradeable` can be deployed and load values from multiple configurable sources. The median value of all sources is calculated and return within the contract.

## Contract Details

**Data Storage & Retrieval**

- Each data feed is identified by a unique bytes32 identifier.
- Each feed stores the most recent value and the timestamp of the update, which can be accessed using the identifier.

```solidity
function updateValue(bytes32 id, uint128 newValue, uint128 newTimestamp)
```

- A view function is available to return the value and timestamp for further processing.

```solidity
function getLatestValue(bytes32 id) public view returns (uint128 value, uint128 updatedAt)
```

## How to Build & Test

```shell
cd contracts
yarn install
yarn test
```

### Deployment Instructions

#### Oracle Gas Optimized

This contract is gas optimized and can only have one reporter.

```shell
# For TestNet
PRIVATE_KEY="0x…" NETWORK=vechain yarn deploy OracleGasOptimized

# For MainNet
PRIVATE_KEY="0x…" NETWORK=main yarn deploy OracleGasOptimized
```

After deployment, the ABI and Addresses are archived in the `outputs/` folder.

#### Oracle Upgradeable

This contract is designed to be upgradable and uses roles for access control.

**Roles Defined**

1. DEFAULT_ADMIN_ROLE: This role can grant and revoke any role.
2. UPGRADER_ROLE: This role is responsible for authorizing contract upgrades.
3. REPORTER_ROLE: This role can set new data values.

**Data Storage & Retrieval**

- Each data feed is identified by a unique bytes32 identifier.
- Each feed stores the most recent value and the timestamp of the update, which can be accessed using the identifier.
- Only users with the REPORTER_ROLE can update the data.

```solidity
function updateValue(bytes32 id, uint256 newValue, uint64 newTimestamp)
```

- A view function is available to return the value and timestamp for further processing.

```solidity
function getLatestValue(bytes32 id) public view returns (uint256 value, uint64 updatedAt)
```

**Initial Deployment**

```shell
# For TestNet
PRIVATE_KEY="0x…" NETWORK=vechain yarn deploy:proxy OracleUpgradable

# For MainNet
PRIVATE_KEY="0x…" NETWORK=main yarn deploy:proxy OracleUpgradable
```

After deployment, the ABI and Addresses are archived in the `outputs/` folder.

**Upgrades**

```shell
PRIVATE_KEY="0x…" NETWORK=vechain yarn deploy:upgrade OracleUpgradable
```

#### Oracle Aggregator

This contract collects data from various Oracle-Contracts and provides the median from their latest data. Each contract must be added using `addSource`.

The contract can be upgraded and controlled by the `ADMIN_ROLE` using the following functions:

1. `addSource(address sourceAddress)` - Adds a new data source.
2. `removeSource(address sourceAddress)` - Removes an existing data source.
3. `isSource(address sourceAddress) returns (bool)` - Checks if a given address is a data source.
4. `sources() returns (addresses[])` - Returns a list of all data sources.

**Initial Deployment**

```shell
# For TestNet
PRIVATE_KEY="0x…" NETWORK=vechain yarn deploy:proxy OracleAggregatorUpgradable

# For MainNet
PRIVATE_KEY="0x…" NETWORK=main yarn deploy:proxy OracleAggregatorUpgradable
```

After deployment, the ABI and Addresses are archived in the `outputs/` folder.

**Upgrades**

```shell
PRIVATE_KEY="0x…" NETWORK=vechain yarn deploy:upgrade OracleAggregatorUpgradable
```
