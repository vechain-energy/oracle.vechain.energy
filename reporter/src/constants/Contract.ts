import { ethers } from 'ethers'

export const OracleV1 = new ethers.Interface([
    'function updateValue(bytes32 id, uint128 newValue, uint128 newTimestamp)',
    'function getLatestValue(bytes32 id) public view returns (uint128 value, uint128 updatedAt)'
])
