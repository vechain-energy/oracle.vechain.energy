import publishReport from './publishReport'
import type { FeedContract, Report } from '../types'
import '@vechain.energy/gas'
import signTransaction from './signTransaction'
import { OracleV1 } from '../constants/Contract'
import { ethers } from 'ethers'

jest.mock('@vechain.energy/gas', () => {
    return jest.fn(() => 100);
});

jest.mock('./signTransaction', () => {
    return jest.fn(() => ({ signature: '0xsuccess', address: '0x...' }));
});

describe('publishReport({ contract, report, env })', () => {

    let fetchMock: any = undefined;

    beforeEach(() => {
        fetchMock = jest.spyOn(global, "fetch").mockImplementation(async (url, init): Promise<any> => {
            if (String(url).includes('/blocks/0')) {
                return Promise.resolve({
                    json: () => Promise.resolve(
                        { "number": 0, "id": "0x000000000b2bce3c70bc649a02749e8687721b09ed2e15997f466536b20bb127", "size": 170, "parentID": "0xffffffff00000000000000000000000000000000000000000000000000000000", "timestamp": 1530014400, "gasLimit": 10000000, "beneficiary": "0x0000000000000000000000000000000000000000", "gasUsed": 0, "totalScore": 0, "txsRoot": "0x45b0cfc220ceec5b7c1c62c4d4193d38e4eba48e8815729ce75f9c0ab0e4c1c0", "txsFeatures": 0, "stateRoot": "0x4ec3af0acbad1ae467ad569337d2fe8576fe303928d35b8cdd91de47e9ac84bb", "receiptsRoot": "0x45b0cfc220ceec5b7c1c62c4d4193d38e4eba48e8815729ce75f9c0ab0e4c1c0", "com": false, "signer": "0x0000000000000000000000000000000000000000", "isTrunk": true, "isFinalized": true, "transactions": [] }
                    )
                });
            } else if (String(url).includes('/blocks/best')) {
                return Promise.resolve({
                    json: () => Promise.resolve(
                        { "number": 17294193, "id": "0x0107e371c37676a34c3461ad93cc5209c9681e295f9498e704df2ad4aabf6919", "size": 361, "parentID": "0x0107e370089b166193be262d9a1a5e0a55f3852d52645bebfd310eb4956500b2", "timestamp": 1702973300, "gasLimit": 30000000, "beneficiary": "0xb4094c25f86d628fdd571afc4077f0d0196afb48", "gasUsed": 0, "totalScore": 136670174, "txsRoot": "0x45b0cfc220ceec5b7c1c62c4d4193d38e4eba48e8815729ce75f9c0ab0e4c1c0", "txsFeatures": 1, "stateRoot": "0x1602f9fd2818e06707bc493aabbf1e5b86dd2a292294a481b157a7b950f87191", "receiptsRoot": "0x45b0cfc220ceec5b7c1c62c4d4193d38e4eba48e8815729ce75f9c0ab0e4c1c0", "com": true, "signer": "0xd7b5750dbfae7d2aabc16b0ed16fbf2c048067ca", "isTrunk": true, "isFinalized": false, "transactions": [] })
                });
            } else if (String(url).includes('/transactions')) {
                return Promise.resolve({
                    json: () => Promise.resolve({ id: "test-id" }),
                    text: () => Promise.resolve(JSON.stringify({ id: "test-id" }))
                });
            } else if (String(url).includes('/successful-delegation-url')) {
                return Promise.resolve({
                    json: () => Promise.resolve({ signature: '0x0107e371c37676a34c3461ad93cc5209c9681e295f9498e704df2ad4aabf6919', address: '0x' })
                });
            }
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('generates the correct transaction for updates', async () => {
        const contract = getMockContract()
        const report = getMockReport()
        const env = { PRIVATE_KEY: '0x36e8ad5b5584ff87a823ad5c0e2a9192c22a33d362dac6aca372380e14de9b6b' }
        await publishReport({ contract, report, env })
        expect(signTransaction).toHaveBeenCalledWith(expect.objectContaining({
            body: expect.objectContaining({
                chainTag: 39,
                blockRef: "0x0107e371c37676a3",
                dependsOn: null,
                expiration: 32,
                gas: 100,
                gasPriceCoef: 128,
                reserved: {
                    features: 0
                },
                clauses: [
                    expect.objectContaining({
                        to: contract.address,
                        value: "0x0",
                        data: OracleV1.encodeFunctionData('updateValue', [ethers.encodeBytes32String(report.id), report.value, report.updatedAt])
                    })
                ]
            })
        }), env.PRIVATE_KEY)
    })

    it('uses fee delegation when delegationUrl is configured', async () => {
        const contract = getMockContract({ delegationUrl: 'https://successful-delegation-url' })
        const report = getMockReport()
        await publishReport({ contract, report })
        expect(signTransaction).toHaveBeenCalledWith(expect.objectContaining({
            body: expect.objectContaining({
                reserved: {
                    features: 1
                }
            })
        }), expect.anything())

        expect(fetch).toHaveBeenCalledWith('https://successful-delegation-url', expect.objectContaining({
            method: 'POST',
            headers: { 'content-type': 'application/json' }
        }))
    })

    it('submits the signed transaction correctly', async () => {
        const contract = getMockContract({ delegationUrl: 'https://successful-delegation-url' })
        const report = getMockReport()
        await publishReport({ contract, report, env: { PRIVATE_KEY: '0x36e8ad5b5584ff87a823ad5c0e2a9192c22a33d362dac6aca372380e14de9b6b' } })
        expect(fetch).toHaveBeenCalledWith(`${contract.nodeUrl}/transactions`, expect.objectContaining({
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: expect.stringMatching(/"raw":"0x[a-fA-F0-9]{2,}"/)
        }))
    })

    it('returns raw text result from transaction submission', async () => {
        const contract = getMockContract()
        const report = getMockReport()
        const result = await publishReport({ contract, report })
        expect(result).toBe(JSON.stringify({ id: "test-id" }))
    })
})

function getMockContract(values?: Partial<FeedContract>): FeedContract {
    return {
        nodeUrl: 'https://node-testnet.vechain.energy',
        address: '0x0000000000000000000000000000000000000000',
        ...values
    }
}

function getMockReport(values?: Partial<Report>): Report {
    return {
        id: 'vet-usd',
        value: 0n,
        updatedAt: 0,
        ...values
    }
}