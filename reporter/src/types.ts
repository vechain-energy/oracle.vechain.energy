import { z } from 'zod'

export const FeedConfigSchema = z.object({
  id: z.string(),
  heartbeat: z.number(),
  deviationPoints: z.number(),
  interval: z.number(),
  contract: z.object({
    nodeUrl: z.string(),
    address: z.string()
  }),
  sources: z.array(z.object({
    url: z.string(),
    path: z.string()
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


export const StatusSchema = z.object({
  interval: z.number(),
  heartbeat: z.number(),
  deviationPoints: z.number(),
  nextUpdate: z.number().nullable(),
  latestValue: ReportSchema.extend({
    formattedValue: z.string(),
  }).optional(),
});

export interface Env {
  ValueReporter: DurableObjectNamespace
  PRIVATE_KEY: string
  VEN_API_KEY: string
  API_KEY: string
}

export type Report = z.infer<typeof ReportSchema>;
export type FeedConfig = z.infer<typeof FeedConfigSchema>;
export type Status = z.infer<typeof StatusSchema>;