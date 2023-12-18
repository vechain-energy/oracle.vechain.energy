import publishReport from './publishReport'
import type { FeedConfig, FeedContract, Report } from '../types'
import { ethers } from 'ethers'
import { OracleV1 } from '../constants/Contract'


describe('publishReport({ contract, report, env })', () => {

    let fetchMock: any = undefined;

    beforeEach(() => {
        fetchMock = jest.spyOn(global, "fetch")
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('returns raw text result from transaction submission', async () => {
        const contract = getMockContract()
        const report = getMockReport()
        const mockResponse = {
            text: jest.fn().mockResolvedValue('mocked response')
        }
        fetchMock.mockResolvedValue(mockResponse as any)
        const result = await publishReport({ contract, report })
        expect(fetchMock).toHaveBeenCalled()
        expect(result).toBe('mocked response')
    })

    it('submits the correct transaction call with updateValue(id, newValue, newTimestamp)', async () => {
        const contract = getMockContract()
        const report = getMockReport()

        const clauses = [
            {
                to: contract.address,
                data: OracleV1.encodeFunctionData('updateValue', [ethers.encodeBytes32String(report.id), report.value, report.updatedAt])
            }
        ]

        await publishReport({ contract, report })
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

function getMockContract(values?: Partial<FeedContract>): FeedContract {
    return {
        nodeUrl: 'https://',
        address: '0x..',
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