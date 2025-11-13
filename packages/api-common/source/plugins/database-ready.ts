import type Hapi from "@hapi/hapi";
import type { Contracts as ApiDatabaseContracts} from "@mainsail/api-database";
import { Identifiers as ApiDatabaseIdentifiers } from "@mainsail/api-database";
import type { Contracts } from "@mainsail/contracts";

export const databaseReady = {
	getOnRequestHandler(app: Contracts.Kernel.Application) {
		const systemRepository = app.get<ApiDatabaseContracts.SystemRepositoryFactory>(
			ApiDatabaseIdentifiers.SystemRepositoryFactory,
		)();

		const inMaintenance = async () => {
			try {
				return systemRepository.inMaintenance();
			} catch {
				return true;
			}
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
