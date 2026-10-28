import type Hapi from "@hapi/hapi";
import type { Contracts as ApiDatabaseContracts } from "@mainsail/api-database";
import type { Contracts } from "@mainsail/contracts";

import { Identifiers as ApiDatabaseIdentifiers } from "@mainsail/api-database";

const refreshInterval = 1000;

export const databaseReady = {
	getOnRequestHandler(app: Contracts.Kernel.Application) {
		const systemRepository = app.get<ApiDatabaseContracts.SystemRepositoryFactory>(
			ApiDatabaseIdentifiers.SystemRepositoryFactory,
		)();

		let check: Promise<boolean> | undefined;
		let checkedAt = 0;

		const inMaintenance = (): Promise<boolean> => {
			if (!check || Date.now() - checkedAt >= refreshInterval) {
				checkedAt = Date.now();
				check = systemRepository.inMaintenance().catch(() => {
					check = undefined;
					return true;
				});
			}

			return check;
		};

		return async (request: Hapi.Request, h: Hapi.ResponseToolkit): Promise<Hapi.Lifecycle.ReturnValue> => {
			if (await inMaintenance()) {
				return h
					.response({ error: "Service Unavailable", reason: "Database not ready" })
					.code(503)
					.header("Retry-After", "10")
					.takeover();
			}

			return h.continue;
		};
	},
	name: "database-ready",

	register(server: Contracts.Api.ApiServer): void {
		server.ext("onRequest", this.getOnRequestHandler(server.app.app));
	},

	version: "1.0.0",
};
