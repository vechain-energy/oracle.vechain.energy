import fetchDataSources, { fetchDataSource } from './fetchDataSources'
import type { FeedConfig } from '../types'
import { ethers } from 'ethers'


describe('fetchDataSources(config)', () => {
    let fetchMock: any = undefined;

    beforeEach(() => {
        fetchMock = jest.spyOn(global, "fetch")
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('loads data from each source', async () => {
        const config = getMockTask({
            sources: [
                { url: 'https://postman-echo.com/get?key=102', path: '.args.key' },
                { url: 'https://postman-echo.com/get?key=108', path: '.args.key' }
            ]
        })

        await fetchDataSources(config)
        expect(fetchMock).toHaveBeenCalledTimes(config.sources.length)
        config.sources.forEach(source => {
            expect(fetchMock).toHaveBeenCalledWith(source.url)
        })
    })

    it('returns the average number for all data sources', async () => {
        const config = getMockTask({
            sources: [
                { url: 'https://postman-echo.com/get?key=102', path: '.args.key' },
                { url: 'https://postman-echo.com/get?key=108', path: '.args.key' }
            ]
        })

        const result = await fetchDataSources(config)
        expect(String(result)).toEqual(String(ethers.parseUnits(String((102 + 108) / 2), 12)))
    })


    it('returns bigint with 12 decimal representation (parseUnits(value, 12) / uint128)', async () => {
        const config = getMockTask({
            sources: [{ url: 'https://postman-echo.com/get?key=102', path: '.test.key' }]
        })

        const mockResponse = {
            json: jest.fn(() => ({ test: { key: '1' } }))
        }

        fetchMock.mockResolvedValue(mockResponse as any)
        const result = await fetchDataSources(config)
        expect(String(result)).toEqual(String(ethers.parseUnits("1", 12)))
    })


    it('ignores errored sources', async () => {
        const config = getMockTask({
            sources: [
                { url: 'https://postman-echo.com/get?key=103', path: '.args.key' },
                { url: 'https://postman-echo.com/get?key2=105', path: '.args.key' },
                { url: 'https://postman-echo.com/get?key=106', path: '.args.key' }
            ]
        })

        const result = await fetchDataSources(config)
        expect(String(result)).toEqual(String(ethers.parseUnits(String((103 + 106) / 2), 12)))
    })

    it('ignores sources that are have a 10% difference to the others', async () => {
        const config = getMockTask({
            sources: [
                { url: 'https://postman-echo.com/get?key=101', path: '.args.key' },
                { url: 'https://postman-echo.com/get?key=120', path: '.args.key' },
                { url: 'https://postman-echo.com/get?key=102', path: '.args.key' }
            ]
        })

        const result = await fetchDataSources(config)
        expect(String(result)).toEqual(String(ethers.parseUnits(String((101 + 102) / 2), 12)))
    })


    describe('fetchDataSource(config.source)', () => {
        it('throws if response can not be parsed as jon', async () => {
            const source = { url: 'https://postman-echo.com/get?key=1', path: '.args.key' }


            const mockResponse = {
                json: jest.fn(() => { throw new Error('no json') })
            }
            fetchMock.mockResolvedValue(mockResponse as any)
            await expect(fetchDataSource(source)).rejects.toThrow('no json')

        })

        it('throws if the path is invalid', async () => {
            const source = { url: 'https://postman-echo.com/get?key=1', path: '.test.key2' }


            const mockResponse = {
                json: jest.fn(() => ({ test: { key: '0.1' } }))
            }
            fetchMock.mockResolvedValue(mockResponse as any)
            await expect(fetchDataSource(source)).rejects.toThrow('invalid path')
        })

        it('throws if the value can not be parsed as number', async () => {
            const source = { url: 'https://postman-echo.com/get?key=1', path: '.test.key' }


            const mockResponse = {
                json: jest.fn(() => ({ test: { key: 'a0f1' } }))
            }
            fetchMock.mockResolvedValue(mockResponse as any)
            await expect(fetchDataSource(source)).rejects.toThrow('could not extract number value from')
        })

        it('returns the number at the defined path in the fetched document', async () => {
            const source = { url: 'https://postman-echo.com/get?1', path: '.test.key' }


            const mockResponse = {
                json: jest.fn(() => ({ test: { key: '0.1' } }))
            }
            fetchMock.mockResolvedValue(mockResponse as any)
            const num = await fetchDataSource(source)

            expect(num).toEqual(0.1)
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
