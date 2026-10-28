import type Hapi from "@hapi/hapi";
import type { Contracts as ApiDatabaseContracts } from "@mainsail/api-database";
import type { Contracts } from "@mainsail/contracts";

import { Identifiers as ApiDatabaseIdentifiers } from "@mainsail/api-database";

const refreshInterval = 1000;

export const responseHeaders = {
	getOnPreResponseHandler(app: Contracts.Kernel.Application) {
		const blockRepositoryFactory = app.get<ApiDatabaseContracts.BlockRepositoryFactory>(
			ApiDatabaseIdentifiers.BlockRepositoryFactory,
		);

		let lookup: Promise<number | undefined> | undefined;
		let lookedUpAt = 0;

		const getLatestHeight = (): Promise<number | undefined> => {
			if (!lookup || Date.now() - lookedUpAt >= refreshInterval) {
				lookedUpAt = Date.now();
				lookup = blockRepositoryFactory()
					.getLatestHeight()
					.catch(() => {
						lookup = undefined;
						return undefined;
					});
			}

			return lookup;
		};

		return async (request: Hapi.Request, h: Hapi.ResponseToolkit): Promise<Hapi.Lifecycle.ReturnValue> => {
			if ("statusCode" in request.response) {
				if (request.response.statusCode === 503) {
					return h.continue;
				}
			}

			const blockNumber = await getLatestHeight();

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
