import Hapi from "@hapi/hapi";
import { Contracts } from "@mainsail/contracts";
import { Contracts as ApiDatabaseContracts, Identifiers as ApiDatabaseIdentifiers } from "@mainsail/api-database";

export const responseHeaders = {
	getOnPreResponseHandler(app: Contracts.Kernel.Application) {
		const blockRepositoryFactory = app.get<ApiDatabaseContracts.IBlockRepositoryFactory>(ApiDatabaseIdentifiers.BlockRepositoryFactory);

		return async (request: Hapi.Request, h: Hapi.ResponseToolkit): Hapi.Lifecycle.ReturnValue => {
			const blockHeight = await blockRepositoryFactory().getLatestHeight();

			const responsePropertyToUpdate = request.response.isBoom ? request.response.output : request.response;
			responsePropertyToUpdate.headers = responsePropertyToUpdate.headers ?? {};
			responsePropertyToUpdate.headers["x-block-height"] = blockHeight;

			return h.continue;
		}
	},
	name: "response-headers",

	register(server: Hapi.Server): void {
		server.ext("onPreResponse", this.getOnPreResponseHandler(server.app.app));
	},

	version: "1.0.0",
};
