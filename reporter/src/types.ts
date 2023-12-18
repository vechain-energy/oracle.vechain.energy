import { z } from 'zod'

export const FeedContractSchema = z.object({
  nodeUrl: z.string(),
  address: z.string()
})

export const FeedConfigSchema = z.object({
  id: z.string(),
  heartbeat: z.number(),
  deviationPoints: z.number(),
  interval: z.number(),
  contracts: z.array(FeedContractSchema),
  sources: z.array(z.object({
    url: z.string(),
    path: z.string(),
    method: z.enum(['POST', 'GET']).optional(),
    body: z.string().optional(),
    headers: z.record(z.string()).optional(),
    decimals: z.number().default(18).optional()
})).min(1),
});

export const ReportSchema = z.object({
  id: z.string(),
  value: z.bigint(),
  updatedAt: z.number(),
});
export const CcipRequestSchema = z.object({
  sender: z.string(),
  urls: z.array(z.string()).optional(),
  callData: z.string(),
  callbackFunction: z.string().optional(),
  extraData: z.string().optional(),
})

export type CcipRequest = z.infer<typeof CcipRequestSchema>;


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

export interface Env {
  ValueReporter: DurableObjectNamespace
  PRIVATE_KEY: string
  API_KEY: string
}

export type Report = z.infer<typeof ReportSchema>;
export type FeedConfig = z.infer<typeof FeedConfigSchema>;
export type FeedContract = z.infer<typeof FeedContractSchema>;
export type Status = z.infer<typeof StatusSchema>;
export type DataResult = z.infer<typeof DataSourceResultSchema>;
