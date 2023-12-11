import { ethers } from 'ethers'

export const OracleV1 = new ethers.Interface([
    'function updateValue(bytes32 id, uint256 newValue, uint64 newTimestamp)',
    'function getLatestValue(bytes32 id) public view returns (uint256 value, uint64 updatedAt)'
])
