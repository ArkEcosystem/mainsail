import { Identifiers, Units } from "@mainsail/constants";
import { inject, injectable, tagged } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import { http, HttpResponse } from "@mainsail/utils";

const helloWorld = { data: "Hello World from Transaction Pool API!" };
const helloWorldLength = JSON.stringify(helloWorld).length;

@injectable()
export class TxPoolNodeVerifier implements Contracts.P2P.TxPoolNodeVerifier {
	@inject(Identifiers.P2P.Logger)
	private readonly logger!: Contracts.P2P.Logger;

	@inject(Identifiers.ServiceProvider.Configuration)
	@tagged("plugin", "p2p")
	private readonly configuration!: Contracts.Kernel.PluginConfiguration;

	public async verify(node: Contracts.P2P.TxPoolNode): Promise<boolean> {
		if (this.configuration.getRequired<boolean>("skipPeerStateVerification")) {
			return true;
		}

		try {
			const response = await http.get<{ data: string }>(node.url, {
				headers: {},
				maxContentLength: 1 * Units.KILOBYTE,
				timeout: 5000,
			});

			this.#verifyStatusCode(response);
			this.#verifyHeaders(response);
			this.#verifyResponseBody(response);
		} catch (error) {
			this.logger.debugExtra(`TX Pool node ${node.url} verification failed: ${error.message}`, "p2p");
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

	#verifyResponseBody(response: HttpResponse<{ data: string }>): void {
		if (response.data.data !== helloWorld.data) {
			throw new Error("Invalid response body");
		}
	}
}
