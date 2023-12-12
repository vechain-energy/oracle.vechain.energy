import isUpdateRequired from './isUpdateRequired'
import type { FeedConfig, Report } from '../types'
import { ethers } from 'ethers'
import { Oracle } from '../constants/Contract'


describe('isUpdateRequired(config, value)', () => {

    let fetchMock: any = undefined;

    beforeEach(() => {
        fetchMock = jest.spyOn(global, "fetch")
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('requests last value correctly from blockchain', async () => {
        const config = getMockTask()

        const mockResponse = {
            json: jest.fn().mockResolvedValue({ data: '0x', reverted: false })
        }
        fetchMock.mockResolvedValue(mockResponse as any)

        await isUpdateRequired(config, BigInt(0))
        expect(fetchMock).toHaveBeenCalledWith(`${config.contract.nodeUrl}/accounts/*`, {
            method: 'POST',
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({
                clauses: [
                    {
                        to: config.contract.address,
                        data: Oracle.encodeFunctionData("getLatestValue", [
                            ethers.encodeBytes32String(config.id),
                        ]),
                    },
                ],
            })
        })
    })

    it('returns false if blockchain node could not handle data correctly', async () => {
        const config = getMockTask()

        const value = 100
        const timestamp = 200
        const data = Oracle.encodeFunctionResult('getLatestValue', [value, timestamp])
        const mockResponse = {
            json: jest.fn().mockResolvedValue({})
        }
        fetchMock.mockResolvedValue(mockResponse as any)

        const result = await isUpdateRequired(config, BigInt(0))
        expect(result).toEqual(false)
    })

    it('returns true if contract reverts due missing data', async () => {
        const config = getMockTask()

        const value = 100
        const timestamp = 200
        const data = Oracle.encodeFunctionResult('getLatestValue', [value, timestamp])
        const mockResponse = {
            json: jest.fn().mockResolvedValue([{ data, reverted: true }])
        }
        fetchMock.mockResolvedValue(mockResponse as any)

        const result = await isUpdateRequired(config, BigInt(0))
        expect(result).toEqual(true)
    })


    describe('heartbeat', () => {
        it('returns true if last update is >= heartbeat interval', async () => {
            const config = getMockTask({
                heartbeat: 50
            })

            const value = 100
            const timestamp = Math.floor(Date.now() / 1000) - config.heartbeat
            const data = Oracle.encodeFunctionResult('getLatestValue', [value, timestamp])
            const mockResponse = {
                json: jest.fn().mockResolvedValue([{ data, reverted: false }])
            }
            fetchMock.mockResolvedValue(mockResponse as any)

            const result = await isUpdateRequired(config, BigInt(0))
            expect(result).toEqual(true)
        })

        it('returns false if age < heartbeat interval', async () => {
            const config = getMockTask({
                heartbeat: 50
            })

            const value = 100
            const timestamp = Math.floor(Date.now() / 1000) - config.heartbeat + 1
            const data = Oracle.encodeFunctionResult('getLatestValue', [value, timestamp])
            const mockResponse = {
                json: jest.fn().mockResolvedValue([{ data, reverted: false }])
            }
            fetchMock.mockResolvedValue(mockResponse as any)

            const result = await isUpdateRequired(config, BigInt(0))
            expect(result).toEqual(false)
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
            const data = Oracle.encodeFunctionResult('getLatestValue', [value, timestamp])
            const mockResponse = {
                json: jest.fn().mockResolvedValue([{ data, reverted: false }])
            }
            fetchMock.mockResolvedValue(mockResponse as any)

            const result = await isUpdateRequired(config, BigInt(newValue))
            expect(result).toEqual(true)
        })

        it('returns false if deviation < configured value', async () => {
            const config = getMockTask({
                deviationPoints: 100
            })

            const value = 100000000
            const newValue = value * 0.991
            const timestamp = Math.floor(Date.now() / 1000)
            const data = Oracle.encodeFunctionResult('getLatestValue', [value, timestamp])
            const mockResponse = {
                json: jest.fn().mockResolvedValue([{ data, reverted: false }])
            }
            fetchMock.mockResolvedValue(mockResponse as any)

            const result = await isUpdateRequired(config, BigInt(newValue))
            expect(result).toEqual(false)
        })
    })
})

function getMockTask(values?: Partial<FeedConfig>): FeedConfig {
    return {
        id: 'vet-usd',
        heartbeat: 86400,
        deviationPoints: 100,
        interval: 10,
        contract: {
            nodeUrl: 'https://node-testnet.vechain.energy',
            address: '0x..'
        },
        sources: [
            {
                url: 'https://test.com',
                path: ''
            }
        ],
        ...values
    }
}
