import type { FeedConfig } from "../types";
import { ethers } from 'ethers'

// single values that have a huge difference to the average will be ignored
const IGNORE_OUTLIER_PERCENTAGE = 0.1

type SourceValue = {
    url: string
    path: string
    available: boolean
    value: number
}

type ValueResult = {
    value: bigint
    sources: SourceValue[]
    base: number[]
    outliers: number[]
    errors: number
}

export default async function fetchDataSources(config: FeedConfig): Promise<ValueResult> {
    const result: ValueResult = {
        value: 0n,
        sources: [],
        base: [],
        outliers: [],
        errors: 0
    }

    const values = await Promise.all(
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

    const validValues = values.filter(value => value !== null) as number[]

    const averageWithOutliers = validValues.reduce((a, b) => a + b, 0) / validValues.length;
    const filteredValues = validValues.filter(value => {
        if (Math.abs(value - averageWithOutliers) / averageWithOutliers <= IGNORE_OUTLIER_PERCENTAGE) {
            result.base.push(value)
            return true
        }
        result.outliers.push(value)
        return false
    });

    const averageWithoutOutliers = filteredValues.reduce((a, b) => a + b, 0) / filteredValues.length;
    process.env.NODE_ENV !== 'test' && console.log('__fetched', averageWithoutOutliers, 'as average value')

    result.value = ethers.parseUnits(String(averageWithoutOutliers.toFixed(12)), 12)
    return result
}

export async function fetchDataSource({ url, path }: { url: string, path: string }): Promise<number> {
    const document = await (await fetch(url)).json() as { [key: string]: any }
    const pathParts = path.slice(1).split('.')
    const value = pathParts.reduce((acc, part) => {
        if (!acc || typeof (acc) !== 'object' || !(part in acc)) { throw new Error('invalid path') }
        return acc[part]
    }, document)

    const numValue = parseFloat(String(value))
    if (isNaN(numValue)) { throw new Error(`could not extract number value from: ${value}`) }

    process.env.NODE_ENV !== 'test' && console.log('__fetched', numValue, '@', url, path)
    return numValue
}