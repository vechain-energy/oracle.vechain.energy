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
            expect(fetchMock).toHaveBeenCalledWith(source.url, { method: 'GET' })
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
        expect(String(result.value)).toEqual(String(ethers.parseUnits(String((102 + 108) / 2), 12)))
    })


    it('returns bigint with 12 decimal representation (parseUnits(value, 12) / uint128) in result.value', async () => {
        const config = getMockTask({
            sources: [{ url: 'https://postman-echo.com/get?key=102', path: '.test.key' }]
        })

        const mockResponse = {
            json: jest.fn(() => ({ test: { key: '1' } }))
        }

        fetchMock.mockResolvedValue(mockResponse as any)
        const result = await fetchDataSources(config)
        expect(String(result.value)).toEqual(String(ethers.parseUnits("1", 12)))
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
        expect(String(result.value)).toEqual(String(ethers.parseUnits(String((103 + 106) / 2), 12)))
    })

    it('counts errored sources in result.errors', async () => {
        const config = getMockTask({
            sources: [
                { url: 'https://postman-echo.com/get?key=103', path: '.args.key' },
                { url: 'https://postman-echo.com/get?error=105', path: '.args.errored.key' },
                { url: 'https://postman-echo.com/get?key=106', path: '.args.key' }
            ]
        })

        const result = await fetchDataSources(config)
        expect(result.errors).toEqual(1)
    })

    it('returns a source success report in result.sources', async () => {
        const sources = [
            { url: 'https://postman-echo.com/get?key=103', path: '.args.key' },
            { url: 'https://postman-echo.com/get?error=105', path: '.args.errored.key' },
            { url: 'https://postman-echo.com/get?key=106', path: '.args.key' }
        ]
        const config = getMockTask({ sources })

        const result = await fetchDataSources(config)
        expect(result.sources).toHaveLength(sources.length)
        expect(result.sources).toEqual(expect.arrayContaining([
            { ...sources[0], available: true, value: 103 },
            { ...sources[1], available: false, value: 0 },
            { ...sources[2], available: true, value: 106 },
        ]))
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
        expect(String(result.value)).toEqual(String(ethers.parseUnits(String((101 + 102) / 2), 12)))
    })


    it('returns outlier values in result.outliers', async () => {
        const config = getMockTask({
            sources: [
                { url: 'https://postman-echo.com/get?key=101', path: '.args.key' },
                { url: 'https://postman-echo.com/get?key=120', path: '.args.key' },
                { url: 'https://postman-echo.com/get?key=102', path: '.args.key' }
            ]
        })

        const result = await fetchDataSources(config)
        expect(result.outliers).toEqual([120])
    })

    it('returns values used to calculate the average in result.base', async () => {
        const config = getMockTask({
            sources: [
                { url: 'https://postman-echo.com/get?key=101', path: '.args.key' },
                { url: 'https://postman-echo.com/get?key=120', path: '.args.key' },
                { url: 'https://postman-echo.com/get?key=102', path: '.args.key' }
            ]
        })

        const result = await fetchDataSources(config)
        expect(result.base).toEqual([101, 102])
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

        it.each(['GET', 'POST'])('supports http verb "%s"', async (verb) => {
            const source = { url: 'https://postman-echo.com/get?1', path: '.test.key', method: verb as 'GET' | 'POST' }

            const mockResponse = {
                json: jest.fn(() => ({ test: { key: '0.1' } }))
            }
            fetchMock.mockResolvedValue(mockResponse as any)
            const num = await fetchDataSource(source)

            expect(fetchMock).toHaveBeenCalledWith(source.url, {
                method: verb
            })
        })

        it('supports sending a custom body', async () => {
            const source = { url: 'https://postman-echo.com/post', path: '.test.key', method: 'POST' as 'GET' | 'POST', body: '{"hello":"world"}' }

            const mockResponse = {
                json: jest.fn(() => ({ test: { key: '0.1' } }))
            }
            fetchMock.mockResolvedValue(mockResponse as any)
            const num = await fetchDataSource(source)

            expect(fetchMock).toHaveBeenCalledWith(source.url, {
                method: source.method,
                body: source.body
            })
        })

        it('supports sending custom headers', async () => {
            const source = { url: 'https://postman-echo.com/post', path: '.test.key', method: 'POST' as 'GET' | 'POST', body: '{"hello":"world"}', headers: { 'content-type': 'application/json' } }

            const mockResponse = {
                json: jest.fn(() => ({ test: { key: '0.1' } }))
            }
            fetchMock.mockResolvedValue(mockResponse as any)
            const num = await fetchDataSource(source)

            expect(fetchMock).toHaveBeenCalledWith(source.url, {
                method: source.method,
                body: source.body,
                headers: source.headers
            })
        })

        it('supports hex values in response', async () => {
            const source = { url: 'https://postman-echo.com/post', path: '.test.key', method: 'POST' as 'GET' | 'POST', body: '{"hello":"world"}', headers: { 'content-type': 'application/json' }, decimals: 0 }

            const mockResponse = {
                json: jest.fn(() => ({ test: { key: '0x00000000000000000000ff' } }))
            }
            fetchMock.mockResolvedValue(mockResponse as any)
            const num = await fetchDataSource(source)

            expect(num).toEqual(255)
        })

        it('supports decimals values in response', async () => {
            const source = { url: 'https://postman-echo.com/post', path: '.test.key', method: 'POST' as 'GET' | 'POST', body: '{"hello":"world"}', headers: { 'content-type': 'application/json' }, decimals: 0 }

            const mockResponse = {
                json: jest.fn(() => ({ test: { key: '0x00000000000000000000000000000000000000000000000000000000067cd629' } }))
            }
            fetchMock.mockResolvedValue(mockResponse as any)
            const num = await fetchDataSource(source)

            expect(num).toEqual(108844585)
        })
    })
})

function getMockTask(values?: Partial<FeedConfig>): FeedConfig {
    return {
        id: 'vet-usd',
        heartbeat: 86400,
        deviationPoints: 100,
        interval: 10,
        contracts: [{
            nodeUrl: 'https://',
            address: '0x..'
        }],
        sources: [
            {
                url: 'https://test.com',
                path: ''
            }
        ],
        ...values
    }
}
