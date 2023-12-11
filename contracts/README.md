# Oracle / Data Feed for Vechain

## Contract Details

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

### How to Build & Test

```shell
cd contracts
yarn install
yarn test
```

### Deployment Instructions

```shell
# For TestNet
PRIVATE_KEY="0x…" NETWORK=vechain yarn deploy:proxy OracleV1

# For MainNet
PRIVATE_KEY="0x…" NETWORK=main yarn deploy:proxy OracleV1
```

After deployment, the ABI and Addresses are archived in the `outputs/` folder.

#### How to Upgrade

```shell
PRIVATE_KEY="0x…" NETWORK=vechain yarn deploy:upgrade OracleV1
```
