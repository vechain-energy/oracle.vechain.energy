import type { FeedConfig, DataResult } from "../types";
import { ethers, formatUnits } from 'ethers'

export default async function fetchDataSources(config: FeedConfig): Promise<DataResult> {
    const result: DataResult = {
        value: 0n,
        sources: [],
        values: [],
        errors: 0
    }

    const dataSourceValues: (number | null)[] = await Promise.all(
        config.sources
            .map(source =>
                fetchDataSource(source)
                    .then(value => {
                        result.sources.push({ ...source, value, available: true })
                        return value
                    })
                    .catch((err) => {
                        // null represents errored values
                        process.env.NODE_ENV !== 'test' && console.error(source.url, 'will be ignored', err)

                        result.sources.push({ ...source, value: 0, available: false })
                        result.errors += 1
                        return null
                    })
            )
    )

    const sortedValues = dataSourceValues
        .filter(value => value !== null)
        .map(value => Number(value))
        .sort((a, b) => a - b)

    result.values.push(...sortedValues)

    const mid = Math.floor(result.values.length / 2);
    const medianValue = result.values.length % 2 ? result.values[mid] : (result.values[mid - 1] + result.values[mid]) / 2;

    process.env.NODE_ENV !== 'test' && console.log('__fetched', medianValue, 'as median value')

    result.value = ethers.parseUnits(String(medianValue.toFixed(12)), 12)
    return result
}

export async function fetchDataSource({ url, path, method = 'GET', body, headers, decimals }: { url: string, path: string, method?: 'GET' | 'POST', body?: string, headers?: Record<string, string>, decimals?: number }): Promise<number> {
    const fetchArgs = {
        method,
        headers,
        body
    }
    const document = await (await fetch(url, fetchArgs)).json() as { [key: string]: any }
    const pathParts = path.slice(1).split('.')
    const value = String(pathParts.reduce((acc, part) => {
        if (!acc || typeof (acc) !== 'object' || !(part in acc)) { throw new Error('invalid path') }
        return acc[part]
    }, document))

    const numValue = value.startsWith('0x') ? parseFloat(formatUnits(value, decimals)) : parseFloat(value)

    if (isNaN(numValue)) { throw new Error(`could not extract number value from: ${value}`) }

    process.env.NODE_ENV !== 'test' && console.log('__fetched', numValue, '@', url, path)
    return numValue
}