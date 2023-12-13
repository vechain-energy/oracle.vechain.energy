import type { FeedConfig, Report, Env, CcipRequest, CcipRequestSchema } from '../types'
import { decodeBytes32String, ethers } from 'ethers';

export default async function signCcipRequest({ request, config, report, env }: { request: CcipRequest, config: FeedConfig, report: Report, env?: { PRIVATE_KEY: string } }): Promise<string> {
    // verify request data
    const requestedFeedId = decodeBytes32String(request.callData.padEnd(66, '0'))
    if (requestedFeedId !== config.id) { throw new Error(`${requestedFeedId} requested but ${config.id} call`) }

    // encode a response that is valid until the next heartbeat
    const validUntil = Math.floor(Date.now() / 1000 + config.heartbeat)
    const encodedResponse = ethers.AbiCoder.defaultAbiCoder().encode(['uint128', 'uint128'], [report.value, report.updatedAt])

    // message for the requestee
    const messageHash = ethers.solidityPackedKeccak256(
        ["bytes", "address", "uint64", "bytes32", "bytes32"],
        [
            "0x1900",
            request.sender,
            validUntil,
            ethers.keccak256(request.extraData ?? '0x'),
            ethers.keccak256(encodedResponse),
        ]
    );

    // sign the message with the backends private key
    const signer = new ethers.SigningKey(env?.PRIVATE_KEY ?? '');
    const signature = signer.sign(messageHash);
    const signatureData = ethers.concat([signature.r, signature.s, `0x${signature.v.toString(16)}`])

    return ethers.AbiCoder.defaultAbiCoder().encode(['bytes', 'uint64', 'bytes'], [encodedResponse, validUntil, signatureData])
}
