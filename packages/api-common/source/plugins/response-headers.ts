import Hapi from "@hapi/hapi";
import { Contracts as ApiDatabaseContracts, Identifiers as ApiDatabaseIdentifiers } from "@mainsail/api-database";
import { Contracts } from "@mainsail/contracts";

import { ApiServer } from "../contracts";

export const responseHeaders = {
	getOnPreResponseHandler(app: Contracts.Kernel.Application) {
		const blockRepositoryFactory = app.get<ApiDatabaseContracts.IBlockRepositoryFactory>(
			ApiDatabaseIdentifiers.BlockRepositoryFactory,
		);

		return async (request: Hapi.Request, h: Hapi.ResponseToolkit): Promise<Hapi.Lifecycle.ReturnValue> => {
			const blockHeight = await blockRepositoryFactory().getLatestHeight();

			const responsePropertyToUpdate = "isBoom" in request.response ? request.response.output : request.response;
			responsePropertyToUpdate.headers["x-block-height"] = blockHeight;

			return h.continue;
		};
	},
	name: "response-headers",

	register(server: ApiServer): void {
		if (server.app.app.isBound(ApiDatabaseIdentifiers.BlockRepositoryFactory)) {
			server.ext("onPreResponse", this.getOnPreResponseHandler(server.app.app));
		}
	},

	version: "1.0.0",
};
