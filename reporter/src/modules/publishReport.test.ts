import publishReport from './publishReport'
import type { FeedConfig, Report } from '../types'
import { ethers } from 'ethers'
import { Oracle } from '../constants/Contract'


describe('publishReport({ config, report, env })', () => {

    let fetchMock: any = undefined;

    beforeEach(() => {
        fetchMock = jest.spyOn(global, "fetch")
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('returns raw text result from transaction submission', async () => {
        const task = getMockTask()
        const report = getMockReport()
        const mockResponse = {
            text: jest.fn().mockResolvedValue('mocked response')
        }
        fetchMock.mockResolvedValue(mockResponse as any)
        const result = await publishReport({ config: task, report })
        expect(fetchMock).toHaveBeenCalled()
        expect(result).toBe('mocked response')
    })

    it('submits the correct transaction call with updateValue(id, newValue, newTimestamp)', async () => {
        const task = getMockTask()
        const report = getMockReport()

        const clauses = [
            {
                to: task.contract.address,
                data: Oracle.encodeFunctionData('updateValue', [ethers.encodeBytes32String(report.id), report.value, report.updatedAt])
            }
        ]

        await publishReport({ config: task, report })
        expect(fetchMock).toHaveBeenCalledWith(
            'https://api.vechain.energy/v1/transaction',
            {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    'x-api-key': '',
                    'x-private-key': ''
                },
                body: JSON.stringify({ clauses })
            }

        )
    })
})

function getMockTask(values?: Partial<FeedConfig>): FeedConfig {
    return {
        id: 'vet-usd',
        heartbeat: 86400,
        deviationPoints: 100,
        interval: 10,
        contract: {
            nodeUrl: 'https://',
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

function getMockReport(values?: Partial<Report>): Report {
    return {
        id: 'vet-usd',
        value: 0n,
        updatedAt: 0,
        ...values
    }
}