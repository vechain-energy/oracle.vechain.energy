export { ValueReporter } from "./ValueReporter"
import { Env } from './types'

const publicMethods = ['GET']

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		if (!['POST', 'DELETE', 'PUT', 'GET'].includes(request.method)) {
			return new Response("Method Not Allowed", { status: 405 })
		}

		if (!publicMethods.includes(request.method) && request.headers.get('x-api-key') !== env.API_KEY) {
			return new Response("Access Denied", { status: 403 })
		}

		const url = new URL(request.url)
		const idFromUrl = url.pathname.slice(1)
		const doId = env.ValueReporter.idFromName(idFromUrl);
		const stub = env.ValueReporter.get(doId)
		return stub.fetch(request)
	},
};
