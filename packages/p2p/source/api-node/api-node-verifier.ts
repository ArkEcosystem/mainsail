import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable, tagged } from "@mainsail/container";
import { ensureError, http, HttpResponse } from "@mainsail/utils";
import dayjs from "dayjs";

import { publicLookup } from "../validation/index.js";

// The default API server "/" response
const helloWorld = { data: "Hello World from Public API!" };
const helloWorldLength = JSON.stringify(helloWorld).length;

@injectable()
export class ApiNodeVerifier implements Contracts.P2P.ApiNodeVerifier {
	@inject(Identifiers.P2P.Logger)
	private readonly logger!: Contracts.P2P.Logger;

	@inject(Identifiers.ServiceProvider.Configuration)
	@tagged("plugin", "p2p")
	private readonly configuration!: Contracts.Kernel.PluginConfiguration;

	public async verify(
		apiNode: Contracts.P2P.ApiNode,
		options: Contracts.P2P.AcceptNewApiNodeOptions = {},
	): Promise<boolean> {
		try {
			const apiNodesMaxContentLength = this.configuration.getRequired<number>("apiNodesMaxContentLength");

			const t0 = dayjs();
			apiNode.lastPinged = t0;

			const response = await http.get<{ data: string }>(apiNode.url, {
				// A fresh connection per check, so the lookup below runs every time instead of a kept-alive socket
				// being reused. Checks are minutes apart, keep-alive buys nothing here.
				agent: false,
				headers: {},
				// A peer-sourced host name must resolve to a public address, otherwise a peer could point this node
				// at its own API, a LAN service or a metadata endpoint. Configured nodes are the operator's choice.
				lookup: options.seed ? undefined : publicLookup,
				maxContentLength: apiNodesMaxContentLength,
				timeout: 5000,
			});

			const t1 = dayjs();

			apiNode.statusCode = response.statusCode;
			apiNode.latency = t1.valueOf() - t0.valueOf();
			apiNode.remoteAddress = response.remoteAddress;

			this.#verifyStatusCode(response);
			this.#verifyHeaders(response);
			this.#verifyResponseBody(response);
		} catch (rawError) {
			const error = ensureError(rawError);
			this.logger.debugExtra(`API node ${apiNode.url} verification failed: ${error.message}`, "p2p");
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
		const index = response.headers.findIndex(
			(header, index) => index % 2 === 0 && header.toLowerCase() === "content-length",
		);
		if (index === -1) {
			throw new Error("missing content length");
		}

		const contentLength = Number(response.headers[index + 1]);
		if (contentLength !== helloWorldLength) {
			throw new Error("invalid content length");
		}
	}

	#verifyResponseBody(response: HttpResponse<{ data: string }>): void {
		if (response.data.data !== helloWorld.data) {
			throw new Error("Invalid response body");
		}
	}
}
