import type Hapi from "@hapi/hapi";
import type { Contracts as ApiDatabaseContracts } from "@mainsail/api-database";
import { Identifiers as ApiDatabaseIdentifiers } from "@mainsail/api-database";
import type { Contracts } from "@mainsail/contracts";

export const responseHeaders = {
	getOnPreResponseHandler(app: Contracts.Kernel.Application) {
		const blockRepositoryFactory = app.get<ApiDatabaseContracts.BlockRepositoryFactory>(
			ApiDatabaseIdentifiers.BlockRepositoryFactory,
		);

		return async (request: Hapi.Request, h: Hapi.ResponseToolkit): Promise<Hapi.Lifecycle.ReturnValue> => {
			if ("statusCode" in request.response) {
				if (request.response.statusCode === 503) {
					return h.continue;
				}
			}

			const blockNumber = await blockRepositoryFactory().getLatestHeight();

			const responsePropertyToUpdate = "isBoom" in request.response ? request.response.output : request.response;
			responsePropertyToUpdate.headers["x-block-number"] = blockNumber;

			return h.continue;
		};
	},
	name: "response-headers",

	register(server: Contracts.Api.ApiServer): void {
		server.ext("onPreResponse", this.getOnPreResponseHandler(server.app.app));
	},

	version: "1.0.0",
};
