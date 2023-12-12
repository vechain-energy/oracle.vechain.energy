import { type Env, type FeedConfig, type Report, CcipRequestSchema, FeedConfigSchema, ReportSchema } from './types'
import { z } from 'zod'
import publishReport from './modules/publishReport';
import fetchDataSources from './modules/fetchDataSources';
import isUpdateRequired from './modules/isUpdateRequired'
import signCcipRequest from './modules/signCcipRequest';
import { ethers } from 'ethers';

const StatusSchema = z.object({
  interval: z.number(),
  heartbeat: z.number(),
  deviationPoints: z.number(),
  nextUpdate: z.number().nullable(),
  latestValue: ReportSchema.extend({
    formattedValue: z.string(),
  }).optional(),
});

type Status = z.infer<typeof StatusSchema>;


export class ValueReporter {
  id: DurableObjectId
  storage: DurableObjectStorage
  env: Env
  config?: FeedConfig

  constructor(state: DurableObjectState, env: Env) {
    this.storage = state.storage
    this.id = state.id
    this.env = env
  }

  async fetch(request: Request) {
    try {


      if (request.method === 'DELETE') {
        await this.storage.deleteAll()
        return jsonResponse({ success: true })
      }

      if (request.method === 'GET') {
        try {
          const config = await this.getFeedConfig()
          const latestValue = await this.storage.get<Report>('latestValue')

          const url = new URL(request.url)
          if (url.searchParams.has('sender') && url.searchParams.has('data')) {

            if (!latestValue) {
              return jsonResponse({ error: 'could not a cached value to response with' }, 500)
            }

            const request = CcipRequestSchema.parse({ sender: url.searchParams.get('sender'), data: url.searchParams.get('data') })
            const report = { id: config.id, value: latestValue.value, updatedAt: Number(latestValue.updatedAt) }
            const data = await signCcipRequest({ request, config, report, env: this.env })
            return jsonResponse({ data })
          }

          const nextUpdate = await this.storage.getAlarm()
          const status = <Status>{
            id: config.id,
            interval: config.interval,
            heartbeat: config.heartbeat,
            deviationPoints: config.deviationPoints,
            nextUpdate,
            latestValue: latestValue
              ? {
                ...latestValue,
                formattedValue: ethers.formatUnits(latestValue.value, 12)
              }
              : undefined
          }
          return jsonResponse(status)
        }
        catch (err) {
          const errorMessage = err instanceof Error ? String(err.message) : String(err)
          return jsonResponse({ error: errorMessage ? errorMessage : 'feed not found' }, 404)
        }
      }

      if (request.method === 'POST') {
        const body = await request.json()
        this.config = FeedConfigSchema.parse(body)

        await this.storage.deleteAlarm()
        await this.storage.deleteAll()
        await this.storage.put('config', this.config)
        console.log(this.config.id, 'new configuration', this.config)

        await this.alarm()

        return jsonResponse({ success: true, id: this.config.id })
      }

    }
    catch (err) {
      if (err instanceof z.ZodError) {
        console.log(err.issues)
        return jsonResponse({ success: false, message: err.message }, 500)
      }
      console.log(err)
      return jsonResponse({ success: false, message: 'Internal Error' }, 500)
    }
  }

  async alarm() {
    try {
      await this.runReport()
    }
    catch (err) {
      console.error('Update failed', err)
    }

    const config = await this.getFeedConfig();
    const nextUpdate = await this.scheduleNextUpdate()
    console.log(config.id, 'sleeping till', nextUpdate.toISOString())
  }

  async runReport(): Promise<void> {
    const config = await this.getFeedConfig();

    console.log(config.id, 'updating values')
    const newValue = await fetchDataSources(config)

    const report = {
      id: config.id,
      value: newValue,
      updatedAt: Math.floor(Date.now() / 1000)
    }
    await this.storage.put('latestValue', report)
    console.log(config.id, 'last value:', report.value, 'updatedAt', report.updatedAt)

    const shouldUpdate = await isUpdateRequired(config, newValue)
    if (shouldUpdate) {
      console.log(config.id, '**updating**')
      const updatedDetails = await publishReport({ config, report, env: this.env })
      console.log(config.id, updatedDetails)
    }
    else {
      console.log(config.id, 'not updating')
    }
  }

  async getFeedConfig(): Promise<FeedConfig> {
    try {
      if (!this.config) {
        console.log('no config found in memory, loading from storage')
        const config = await this.storage.get('config')
        this.config = FeedConfigSchema.parse(config)
      }

      return this.config
    } catch (err) {
      console.log(err, JSON.stringify(this.config))
      await this.storage.deleteAll()
      throw (err)
    }
  }

  async scheduleNextUpdate(): Promise<Date> {
    const task = await this.getFeedConfig()
    const nextExecution = Date.now() + (task.interval * 1000)
    this.storage.setAlarm(nextExecution)

    return new Date(nextExecution)
  }
}


function jsonResponse(body: any, statusCode = 200): Response {
  return new Response(
    JSON.stringify(
      body, (_, value) =>
      typeof value === 'bigint'
        ? value.toString()
        : value
    )
    , {
      status: statusCode,
      headers: {
        "content-type": "application/json",
        "access-control-allow-origin": "*"
      }
    })
}