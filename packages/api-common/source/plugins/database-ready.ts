import Hapi from "@hapi/hapi";
import { Contracts as ApiDatabaseContracts, Identifiers as ApiDatabaseIdentifiers } from "@mainsail/api-database";
import { Contracts } from "@mainsail/contracts";

export const databaseReady = {
	getOnRequestHandler(app: Contracts.Kernel.Application) {
		const stateRepositoryFactory = app.get<ApiDatabaseContracts.StateRepositoryFactory>(
			ApiDatabaseIdentifiers.StateRepositoryFactory,
		);

		const isReady = async () => {
			try {
				const state = await stateRepositoryFactory().createQueryBuilder().getOne();
				return !!state;
			} catch {
				return false;
			}
		};

		return async (request: Hapi.Request, h: Hapi.ResponseToolkit): Promise<Hapi.Lifecycle.ReturnValue> => {
			if (!(await isReady())) {
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
