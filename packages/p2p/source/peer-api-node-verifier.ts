import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { http, HttpResponse } from "@mainsail/utils";
import dayjs from "dayjs";

@injectable()
export class PeerApiNodeVerifier implements Contracts.P2P.PeerApiNodeVerifier {
	@inject(Identifiers.P2PLogger)
	private readonly logger!: Contracts.P2P.Logger;

	public async verify(apiNode: Contracts.P2P.PeerApiNode): Promise<boolean> {
		try {
			const t0 = dayjs();
			apiNode.lastPinged = t0;

			const response = await http.get(apiNode.url(), {
				timeout: 5000,
				headers: {},
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
		const contentLength = Number(response.headers[response.headers.findIndex((h) => h === "content-length") + 1]);
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

// The default API server "/" response
const helloWorld = { data: "Hello World!" };
const helloWorldLength = JSON.stringify(helloWorld).length;
