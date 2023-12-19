import { type Env, type FeedConfig, type Report, type Status, CcipRequestSchema, FeedConfigSchema, CcipRequest } from './types'
import { z } from 'zod'
import publishReport from './modules/publishReport';
import fetchDataSources from './modules/fetchDataSources';
import requiredUpdates from './modules/requiredUpdates'
import signCcipRequest from './modules/signCcipRequest';
import { ethers } from 'ethers';

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
      const url = new URL(request.url)

      // The pathname is split into /{feedId}/{feature}/* for routing.
      const [, feature] = url.pathname.slice(1).split('/')
      console.log(request.method, url.pathname)

      if (!feature) {

        // POST /{feedId} – Upsert the feed configuration
        if (request.method === 'POST') {
          const body = await request.json()
          return this.requireApiKey(request, () => this.handleUpdateFeedConfig(FeedConfigSchema.parse(body)))
        }

        // GET /{feedId} – Get a status of the current feed
        if (request.method === 'GET') {
          return request.headers.has('x-api-key')
            ? this.requireApiKey(request, () => this.handleStatusRequest({ report: true }))
            : this.handleStatusRequest()
        }

        // DELETE /{feedId} – Delete current feed configuration
        if (request.method === 'DELETE') {
          return this.requireApiKey(request, () => this.handleDeleteFeedConfig())
        }

      }

      else if (feature === 'resolver') {

        // GET /{feedId}/resolver – Handle a simplified CCIP request with sender={sender}&data={callData}
        if (request.method === 'GET') {
          return this.handleCcipRequest(CcipRequestSchema.parse({ sender: url.searchParams.get('sender'), callData: url.searchParams.get('data') }))
        }

        // POST /{feedId}/resolver – Handle a full CCIP request the full request in the post body
        if (request.method === 'POST') {
          const body = await request.json()
          return this.handleCcipRequest(CcipRequestSchema.parse(body))
        }

      }

      // everything else is an error
      return jsonResponse({ success: false, message: 'Invalid request' }, 500);
    }
    catch (err) {

      // Errors are replied in a uniform way for machine processing
      if (err instanceof z.ZodError) {
        console.log(err.issues)
        return jsonResponse({ success: false, message: err.message }, 500)
      }

      console.log(err)
      return jsonResponse({ success: false, message: 'Internal Error' }, 500)
    }
  }

  /**
   * Runs at the defined interval, ignores errors to keep running indefinitely.
   */
  async alarm() {
    try {
      await this.runReport()
    }
    catch (err) {
      console.error('Update failed', err)
    }
    finally {
      const config = await this.getFeedConfig();
      const nextUpdate = await this.scheduleNextUpdate()
      console.log(config.id, 'sleeping till', nextUpdate.toISOString())
    }
  }

  /**
   * coordinate the report processing
   * - load configuration
   * - fetch data sources
   * - get update decision
   * - trigger on-chain-update
   */
  async runReport(): Promise<void> {
    const config = await this.getFeedConfig();

    console.log(config.id, 'updating values')
    const data = await fetchDataSources(config)

    const report = {
      id: config.id,
      updatedAt: Math.floor(Date.now() / 1000),
      value: data.value
    }
    await this.storage.put('latestValue', report)
    console.log(config.id, 'last value:', report.value, 'updatedAt', report.updatedAt)
    console.log(config.id, 'calculation basics', data)

    const requiredContractUpdates = await requiredUpdates(config, data.value)
    for (const contract of requiredContractUpdates) {
      console.log(config.id, '**updating**')
      const updatedDetails = await publishReport({ contract, report, env: this.env })
      console.log(config.id, updatedDetails)
    }
  }

  /**
   * This is a helper function that retrieves the current feed configuration.
   * @returns {Promise<FeedConfig>} The current feed configuration.
   * @throws {Error} Will throw an error if the feed configuration is not found.
   */
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
      throw new Error('Config Not Found')
    }
  }

  /**
   * This is a helper function that sets the next time to run a report using the interval setting.
   * @returns {Promise<Date>} The data of the next run.
   */
  async scheduleNextUpdate(): Promise<Date> {
    const config = await this.getFeedConfig()
    const nextExecution = Date.now() + (config.interval * 1000)
    this.storage.setAlarm(nextExecution)

    return new Date(nextExecution)
  }

  /**
   * generate status report for client output
   * @returns {Promise<Response>} JSON Response
   */
  async handleStatusRequest(args?: { report: boolean }): Promise<Response> {
    try {
      const config = await this.getFeedConfig()
      const latestValue = await this.storage.get<Report>('latestValue')
      const nextUpdate = await this.storage.getAlarm()

      const unhealthyContracts = latestValue?.value ? await requiredUpdates(config, latestValue.value) : []
      const healthy = !latestValue?.value ? false : unhealthyContracts.length === 0
      const status = <Status>{
        id: config.id,
        config: {
          interval: config.interval,
          heartbeat: config.heartbeat,
          deviationPoints: config.deviationPoints,
          contracts: config.contracts.map(({ address, nodeUrl }) => ({ address, nodeUrl }))
        },
        latestValue: latestValue
          ? {
            ...latestValue,
            formattedValue: ethers.formatUnits(latestValue.value, 12)
          }
          : undefined,
        nextUpdate,
        healthy,
        unhealthyContracts: unhealthyContracts.map(({ address, nodeUrl }) => ({ address, nodeUrl }))
      }

      if (args?.report) {
        status.dataSource = await fetchDataSources(config)
      }

      return jsonResponse(status)

    }
    catch (err) {
      const errorMessage = err instanceof Error ? String(err.message) : String(err)
      return jsonResponse({ success: false, message: errorMessage ? errorMessage : 'feed not found' }, 404)
    }
  }

  /**
   * Checks if the request has a valid API key and then executes the callback function
   * @param {Request} request - The request object
   * @param {() => Promise<Response>} callback - The callback function to execute if the API key is valid
   * @returns {Promise<Response>} JSON Response
   */
  async requireApiKey(request: Request, callback: () => Promise<Response>): Promise<Response> {
    if (request.headers.get('x-api-key') !== this.env.API_KEY) {
      return jsonResponse({ message: 'Access Denied' }, 403)
    }

    return await callback()
  }

  /**
   * Adds or updates configurations based on the input configuration
   * @param {Request} request - The request object
   * @param {FeedConfig} config - The feed configuration object
   * @returns {Promise<Response>} JSON Response
   */
  async handleUpdateFeedConfig(config: FeedConfig): Promise<Response> {
    this.config = config
    await this.storage.deleteAlarm()
    await this.storage.deleteAll()
    await this.storage.put('config', this.config)
    console.log(this.config.id, 'new configuration', this.config)
    await this.alarm()
    return jsonResponse({ success: true, id: this.config.id })
  }

  /**
   * Delete current configuration
   * @param {Request} request - The request object
   * @returns {Promise<Response>} JSON Response
   */
  async handleDeleteFeedConfig(): Promise<Response> {
    await this.storage.deleteAlarm()
    await this.storage.deleteAll()
    return jsonResponse({ success: true })
  }

  /**
   * Generates a signed for CCIP support
   * @param {Request} request - The CcipRequest request object
   * @returns {Promise<Response>} JSON Response
   */
  async handleCcipRequest(request: CcipRequest): Promise<Response> {
    const config = await this.getFeedConfig()
    const latestValue = await this.storage.get<Report>('latestValue')

    if (!latestValue) {
      return jsonResponse({ message: 'missing a cached value to respond with' }, 500)
    }

    const report = { id: config.id, value: latestValue.value, updatedAt: Number(latestValue.updatedAt) }
    const data = signCcipRequest({ request, config, report, env: this.env })
    return jsonResponse({ data })

  }
}


/**
 * This is a helper function to standardize the response output for the client
 * @param {any} body - The body to return
 * @param {number} statusCode - Defaults to 200
 * @returns {Response} 
 */
function jsonResponse(body: any, statusCode = 200): Response {
  return new Response(
    JSON.stringify(
      body, (_, value) =>
      typeof value === 'bigint'
        ? value.toString()
        : value
    ), {
    status: statusCode,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*"
    }
  })
}