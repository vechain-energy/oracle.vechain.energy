export { ValueReporter } from "./ValueReporter"
import { Env } from './types'

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		if (request.method === 'OPTIONS') {
			return new Response('{}', {
				headers: {
					'access-control-allow-methods': 'GET, HEAD, POST, PUT, DELETE, OPTIONS',
					'access-control-allow-origin': '*',
					'access-control-allow-headers': '*'
				}
			})
		}

		if (!['POST', 'DELETE', 'PUT', 'GET'].includes(request.method)) {
			return new Response("Method Not Allowed", { status: 405 })
		}

		const url = new URL(request.url)

		if (url.pathname == "/robots.txt") {
			return new Response("User-agent: *\nDisallow: /", { headers: { "Content-Type": "text/plain" } });
		}

		const idFromUrl = url.pathname.slice(1).split('/')[0]
		const doId = env.ValueReporter.idFromName(idFromUrl);
		const stub = env.ValueReporter.get(doId)
		return stub.fetch(request)
	},
};
