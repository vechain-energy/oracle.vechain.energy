import type { FeedConfig } from "../types";
import { ethers } from 'ethers'

// single values that have a huge difference to the average will be ignored
const IGNORE_OUTLIER_PERCENTAGE = 0.1

export default async function fetchDataSources(config: FeedConfig): Promise<bigint> {
    const values = await Promise.all(
        config.sources
            .map(source =>
                fetchDataSource(source)
                    .catch((err) => {
                        // null represents errored values
                        process.env.NODE_ENV !== 'test' && console.error(source.url, 'will be ignored', err)
                        return null
                    })
            )
    )
    const validValues = values.filter(value => value !== null) as number[]

    const averageWithOutliers = validValues.reduce((a, b) => a + b, 0) / validValues.length;
    const filteredValues = validValues.filter(value => Math.abs(value - averageWithOutliers) / averageWithOutliers <= IGNORE_OUTLIER_PERCENTAGE);

    const averageWithoutOutliers = filteredValues.reduce((a, b) => a + b, 0) / filteredValues.length;
    process.env.NODE_ENV !== 'test' && console.log('__fetched', averageWithoutOutliers, 'as average value')

    return ethers.parseUnits(String(averageWithoutOutliers), 18)
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