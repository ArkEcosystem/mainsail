import { Container, Contracts } from "@arkecosystem/core-kernel";
import Hapi from "@hapi/hapi";

export const responseHeaders = {
	getOnPreResponseHandler(app: Contracts.Kernel.Application) {
		return (request: Hapi.Request, h: Hapi.ResponseToolkit): Hapi.Lifecycle.ReturnValue => {
			const blockHeight = app
				.get<Contracts.Blockchain.Blockchain>(Container.Identifiers.BlockchainService)
				.getLastHeight();

			const responsePropToUpdate = request.response.isBoom ? request.response.output : request.response;
			responsePropToUpdate.headers = responsePropToUpdate.headers ?? {};
			responsePropToUpdate.headers["X-Block-Height"] = blockHeight;

			return h.continue;
		};
	},
	name: "response-headers",

	register(server: Hapi.Server): void {
		server.ext("onPreResponse", this.getOnPreResponseHandler(server.app.app));
	},

	version: "1.0.0",
};
