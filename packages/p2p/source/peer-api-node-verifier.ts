import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { HttpResponse, http } from "@mainsail/utils";
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
				headers: {}
			});

			const t1 = dayjs();

			apiNode.statusCode = response.statusCode;
			apiNode.latency = t1.valueOf() - t0.valueOf();

			this.#verifyStatusCode(response);
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

	#verifyResponseBody(response: HttpResponse): void {
		if (response.data !== helloWorld) {
			throw new Error("Invalid response body");
		}
	}
}

// The default API server "/" response
const helloWorld = JSON.stringify({ data: "Hello World!" });
