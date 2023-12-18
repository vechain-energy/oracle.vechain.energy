import { z } from 'zod'

export const FeedContractSchema = z.object({
    nodeUrl: z.string(),
    address: z.string()
})

export const DataSourceResultSchema = z.object({
    value: z.bigint(),
    sources: z.array(z.object({
        url: z.string(),
        path: z.string(),
        available: z.boolean(),
        value: z.number()
    })),
    base: z.array(z.number()),
    outliers: z.array(z.number()),
    errors: z.number()
})


export const ReportSchema = z.object({
    id: z.string(),
    value: z.bigint(),
    updatedAt: z.number(),
});

export const StatusSchema = z.object({
    id: z.string(),
    healthy: z.boolean(),
    unhealthyContracts: z.array(FeedContractSchema),
    nextUpdate: z.number().nullable(),
    config: z.object({
        interval: z.number(),
        heartbeat: z.number(),
        deviationPoints: z.number(),
        contracts: z.array(FeedContractSchema)
    }),
    dataSource: DataSourceResultSchema.optional(),
    latestValue: ReportSchema.extend({
        formattedValue: z.string(),
    }).optional(),
});



export type Report = z.infer<typeof ReportSchema>;
export type FeedContract = z.infer<typeof FeedContractSchema>;
export type Status = z.infer<typeof StatusSchema>;
export type DataResult = z.infer<typeof DataSourceResultSchema>;
