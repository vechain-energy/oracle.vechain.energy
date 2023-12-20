import requiredUpdates, { isUpdateRequired } from './requiredUpdates'
import type { FeedConfig } from '../types'
import { ethers } from 'ethers'
import { OracleV1 } from '../constants/Contract'


describe('requiredUpdates(config, value)', () => {

    let fetchMock: any = undefined;

    beforeEach(() => {
        fetchMock = jest.spyOn(global, "fetch")
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('returns list of contracts that need updating', async () => {
        const config = getMockTask()

        fetchMock.mockImplementation((nodeUrl: string) => {
            return {
                json: () => {
                    const value = 100
                    const timestamp = Math.floor(Date.now() / 1000) - (nodeUrl.includes('ShouldUpdate') ? (config.heartbeat * 2) : 0)
                    return [
                        {
                            data: OracleV1.encodeFunctionResult('getLatestValue', [value, timestamp]),
                            reverted: false
                        },
                        {
                            data: '0x',
                            reverted: true

                        }
                    ]
                }
            }
        })
        const result = await requiredUpdates(config, BigInt(0))
        expect(result).toEqual([config.contracts[1]])
    })


    it('returns empty list if no contracts need updating', async () => {
        const config = getMockTask()

        fetchMock.mockImplementation(() => {
            return {
                json: () => {
                    const value = 100
                    const timestamp = Math.floor(Date.now() / 1000)
                    const data = OracleV1.encodeFunctionResult('getLatestValue', [value, timestamp])
                    return [{ data, reverted: false }, { data: '0x', reverted: true }]
                }
            }
        })
        const result = await requiredUpdates(config, BigInt(0))
        expect(result).toEqual([])
    })
})

describe('isUpdateRequired(config, value)', () => {

    let fetchMock: any = undefined;

    beforeEach(() => {
        fetchMock = jest.spyOn(global, "fetch")
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('requests last value & prefererd reporter from blockchain', async () => {
        const config = getMockTask()

        const mockResponse = {
            json: jest.fn().mockResolvedValue([
                { data: OracleV1.encodeFunctionResult('getLatestValue', [100, 200]), reverted: false },
                { data: OracleV1.encodeFunctionResult('getPreferredReporter', ['0x96c2E91381C3f3553Ec7f22e7F62ff8c0ff738de']), reverted: false },
            ])
        }
        fetchMock.mockResolvedValue(mockResponse as any)

        await isUpdateRequired(config, config.contracts[0], BigInt(0))
        expect(fetchMock).toHaveBeenCalledWith(`${config.contracts[0].nodeUrl}/accounts/*`, {
            method: 'POST',
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({
                clauses: [
                    {
                        to: config.contracts[0].address,
                        data: OracleV1.encodeFunctionData("getLatestValue", [
                            ethers.encodeBytes32String(config.id),
                        ]),
                    },
                    {
                        to: config.contracts[0].address,
                        data: OracleV1.encodeFunctionData("getPreferredReporter", []),
                    },
                ],
            })
        })
    })

    it('returns false if blockchain node could not handle data correctly', async () => {
        const config = getMockTask()

        const mockResponse = {
            json: jest.fn().mockResolvedValue({})
        }
        fetchMock.mockResolvedValue(mockResponse as any)

        const result = await isUpdateRequired(config, config.contracts[0], BigInt(0))
        expect(result.update).toEqual(false)
    })

    it('returns true if contract reverts due missing data', async () => {
        const config = getMockTask()

        const value = 100
        const timestamp = 200
        const data = OracleV1.encodeFunctionResult('getLatestValue', [value, timestamp])
        const mockResponse = {
            json: jest.fn().mockResolvedValue([{ data, reverted: true }])
        }
        fetchMock.mockResolvedValue(mockResponse as any)

        const result = await isUpdateRequired(config, config.contracts[0], BigInt(0))
        expect(result.update).toEqual(true)
    })


    it('returns preferredReporter', async () => {
        const config = getMockTask()

        const preferredReporter = '0x0000000000000000000000000000000000000123'
        const mockResponse = {
            json: jest.fn().mockResolvedValue([
                {
                    data: OracleV1.encodeFunctionResult('getLatestValue', [100, 200]),
                    reverted: false
                },
                {
                    data: OracleV1.encodeFunctionResult('getPreferredReporter', [preferredReporter]),
                    reverted: false
                }
            ])
        }
        fetchMock.mockResolvedValue(mockResponse as any)
        const result = await isUpdateRequired(config, config.contracts[0], BigInt(0))
        expect(result.preferredReporter).toEqual(preferredReporter)
    })


    describe('heartbeat', () => {
        it('returns true if last update is >= heartbeat interval', async () => {
            const config = getMockTask({
                heartbeat: 50
            })

            const value = 100
            const timestamp = Math.floor(Date.now() / 1000) - config.heartbeat
            const data = OracleV1.encodeFunctionResult('getLatestValue', [value, timestamp])
            const mockResponse = {
                json: jest.fn().mockResolvedValue([{ data, reverted: false }, { data: '0x', reverted: true }])
            }
            fetchMock.mockResolvedValue(mockResponse as any)

            const result = await isUpdateRequired(config, config.contracts[0], BigInt(0))
            expect(result.update).toEqual(true)
        })

        it('returns false if age < heartbeat interval', async () => {
            const config = getMockTask({
                heartbeat: 50
            })

            const value = 100
            const timestamp = Math.floor(Date.now() / 1000) - config.heartbeat + 1
            const data = OracleV1.encodeFunctionResult('getLatestValue', [value, timestamp])
            const mockResponse = {
                json: jest.fn().mockResolvedValue([{ data, reverted: false }, { data: '0x', reverted: true }])
            }
            fetchMock.mockResolvedValue(mockResponse as any)

            const result = await isUpdateRequired(config, config.contracts[0], BigInt(0))
            expect(result.update).toEqual(false)
        })
    })

    describe('deviationPoints', () => {
        it('returns true if deviation >= configured value', async () => {
            const config = getMockTask({
                deviationPoints: 100
            })

            const value = 100000000
            const newValue = (value / 100 / 100) /* equals one point *) */ * config.deviationPoints
            const timestamp = Math.floor(Date.now() / 1000)
            const data = OracleV1.encodeFunctionResult('getLatestValue', [value, timestamp])
            const mockResponse = {
                json: jest.fn().mockResolvedValue([{ data, reverted: false }, { data: '0x', reverted: true }])
            }
            fetchMock.mockResolvedValue(mockResponse as any)

            const result = await isUpdateRequired(config, config.contracts[0], BigInt(newValue))
            expect(result.update).toEqual(true)
        })

        it('returns false if deviation < configured value', async () => {
            const config = getMockTask({
                deviationPoints: 100
            })

            const value = 100000000
            const newValue = value * 0.991
            const timestamp = Math.floor(Date.now() / 1000)
            const data = OracleV1.encodeFunctionResult('getLatestValue', [value, timestamp])
            const mockResponse = {
                json: jest.fn().mockResolvedValue([{ data, reverted: false }, { data: '0x', reverted: true }])
            }
            fetchMock.mockResolvedValue(mockResponse as any)

            const result = await isUpdateRequired(config, config.contracts[0], BigInt(newValue))
            expect(result.update).toEqual(false)
        })
    })
})

function getMockTask(values?: Partial<FeedConfig>): FeedConfig {
    return {
        id: 'vet-usd',
        heartbeat: 86400,
        deviationPoints: 100,
        interval: 10,
        contracts: [
            {
                nodeUrl: 'https://node-testnet.vechain.energy/ShouldNotUpdate',
                address: '0xCurrent'
            },
            {
                nodeUrl: 'https://node-mainnet.vechain.energy/ShouldUpdate',
                address: '0xDeviated'
            },
        ],
        sources: [
            {
                url: 'https://test.com',
                path: ''
            }
        ],
        ...values
    }
}
