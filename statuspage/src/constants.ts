import { Interface } from "ethers";

export const ORACLE_API_URL = process.env.ORACLE_API_URL
export const OracleInterface = new Interface([
    "function getLatestValue(bytes32 id) public view returns (uint128 value, uint128 updatedAt)",
]);


export const FEED_IDS = (process.env.ORACLE_FEED_IDS ?? '')
    .split(',')
    .map(feedId => feedId.trim())
    .filter(feedId => Boolean(feedId))