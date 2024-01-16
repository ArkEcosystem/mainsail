import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";
import { http, HttpResponse } from "@mainsail/utils";
import dayjs from "dayjs";

// The default API server "/" response
const helloWorld = { data: "Hello World!" };
const helloWorldLength = JSON.stringify(helloWorld).length;

@injectable()
export class ApiNodeVerifier implements Contracts.P2P.ApiNodeVerifier {
	@inject(Identifiers.P2P.Logger)
	private readonly logger!: Contracts.P2P.Logger;

	@inject(Identifiers.ServiceProvider.Configuration)
	@tagged("plugin", "p2p")
	private readonly configuration!: Providers.PluginConfiguration;

	public async verify(apiNode: Contracts.P2P.ApiNode): Promise<boolean> {
		try {
			const apiNodesMaxContentLength = this.configuration.getRequired<number>("apiNodesMaxContentLength");

			const t0 = dayjs();
			apiNode.lastPinged = t0;

			const response = await http.get(apiNode.url(), {
				headers: {},
				maxContentLength: apiNodesMaxContentLength,
				timeout: 5000,
			});

			const t1 = dayjs();

			apiNode.statusCode = response.statusCode;
			apiNode.latency = t1.valueOf() - t0.valueOf();

			this.#verifyStatusCode(response);
			this.#verifyHeaders(response);
			this.#verifyResponseBody(response);
		} catch (error) {
			this.logger.debugExtra(`API node ${apiNode.ip} verification failed: ${error.message}`);
			return false;
		}

		return true;
	}

	#verifyStatusCode(response: HttpResponse): void {
		if (response.statusCode !== 200) {
			throw new Error("Invalid status code");
		}
	}

	#verifyHeaders(response: HttpResponse): void {
		const contentLength = Number(response.headers[response.headers.indexOf("content-length") + 1]);
		if (contentLength !== helloWorldLength) {
			throw new Error("invalid content length");
		}
	}

	#verifyResponseBody(response: HttpResponse): void {
		if (response.data.data !== helloWorld.data) {
			throw new Error("Invalid response body");
		}
	}
}
