import signCcipRequest from './signCcipRequest'
import { ethers } from 'ethers'

describe('signCcipRequest({ request, config, report, env })', () => {
    it('signs the request correctly', async () => {
        const feedId = 'test-feed'
        const request = {
            sender: '0x09425C56F3c24E72dFa3E15f007435eb048b6c61',
            callData: ethers.encodeBytes32String(feedId),
            extraData: '0x',
        };
        const config = {
            id: feedId,
            heartbeat: 60,
            deviationPoints: 100,
            interval: 10,
            contract: {
                nodeUrl: 'https://…',
                address: '0x…'
            },
            sources: [
                { url: 'https://…', path: '.' }
            ]
        };
        const report = { id: 'test-feed', value: BigInt(100), updatedAt: 9999 };
        const env = { PRIVATE_KEY: '0x4c764fa090cf8cc7a90b62881202f94aaaca380bb17d13925d1e84ae0f1d99af' };

        const data = await signCcipRequest({ request, config, report, env });

        const { signer } = verify(request.sender, request.extraData, data)
        expect(signer).toEqual('0x09425C56F3c24E72dFa3E15f007435eb048b6c61')
    });

    it('responds with (uint128 value, uint128 updatedAt, bytes32 feedId)', async () => {
        const feedId = 'test-feed'
        const request = {
            sender: '0x09425C56F3c24E72dFa3E15f007435eb048b6c61',
            callData: ethers.encodeBytes32String(feedId),
            extraData: '0x',
        };
        const config = {
            id: feedId,
            heartbeat: 60,
            deviationPoints: 100,
            interval: 10,
            contract: {
                nodeUrl: 'https://…',
                address: '0x…'
            },
            sources: [
                { url: 'https://…', path: '.' }
            ]
        };
        const report = { id: 'test-feed', value: BigInt(100), updatedAt: 9999 };
        const env = { PRIVATE_KEY: '0x4c764fa090cf8cc7a90b62881202f94aaaca380bb17d13925d1e84ae0f1d99af' };

        const data = await signCcipRequest({ request, config, report, env });

        const { result } = verify(request.sender, request.extraData, data)
        const decodedResult = ethers.AbiCoder.defaultAbiCoder().decode(['uint128', 'uint128', 'bytes32'], result)
        expect(String(decodedResult[0])).toEqual(String(report.value))
        expect(String(decodedResult[1])).toEqual(String(report.updatedAt))
        expect(decodedResult[2]).toEqual(ethers.encodeBytes32String(report.id))
    });
})


function verify(target: string, request: string, response: string) {
    const { result, expires, sig } = decodeResponse(response)
    const sigHash = makeSignatureHash(target, expires, request, result)
    const signer = recoverSigner(sigHash, sig)
    return { signer, result }
}

function decodeResponse(response: any): { result: any, expires: number, sig: any } {
    const [result, expires, sig] = ethers.AbiCoder.defaultAbiCoder().decode(
        ['bytes', 'uint64', 'bytes'],
        response
    );

    return { result, expires, sig };
}

function makeSignatureHash(target: any, expires: number, request: any, result: any): string {
    const sigHash = ethers.solidityPackedKeccak256(
        ['bytes', 'address', 'uint64', 'bytes32', 'bytes32'],
        ['0x1900', target, expires, ethers.keccak256(request), ethers.keccak256(result)]
    );
    return sigHash;
}

function recoverSigner(sigHash: string, sig: any): string {
    return ethers.recoverAddress(sigHash, sig);
}
