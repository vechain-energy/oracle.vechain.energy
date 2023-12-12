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

export const StatusSchema = z.object({
  config: FeedConfigSchema,
  lastReport: ReportSchema,
  nextExecution: z.number().nullable(),
});

export const CcipRequestSchema = z.object({
  sender: z.string(),
  data: z.string()
})

export type CcipRequest = z.infer<typeof CcipRequestSchema>;

export interface Env {
  ValueReporter: DurableObjectNamespace
  PRIVATE_KEY: string
  VEN_API_KEY: string
  API_KEY: string
}

export type Report = z.infer<typeof ReportSchema>;
export type Status = z.infer<typeof StatusSchema>;
export type FeedConfig = z.infer<typeof FeedConfigSchema>;

