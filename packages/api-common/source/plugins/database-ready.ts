import type Hapi from "@hapi/hapi";
import type { Contracts as ApiDatabaseContracts } from "@mainsail/api-database";
import type { Contracts } from "@mainsail/contracts";

import { Identifiers as ApiDatabaseIdentifiers } from "@mainsail/api-database";

const refreshInterval = 1000;
const readTimeout = 10_000;
const readTimedOut = "timeout exceeded when reading the maintenance flag";
const timeouts = new Set([
	"timeout exceeded when trying to connect",
	"connection terminated due to connection timeout",
	readTimedOut,
]);

const isTimeout = (error: unknown): boolean => error instanceof Error && timeouts.has(error.message.toLowerCase());

export const databaseReady = {
	getOnRequestHandler(app: Contracts.Kernel.Application) {
		const systemRepository = app.get<ApiDatabaseContracts.SystemRepositoryFactory>(
			ApiDatabaseIdentifiers.SystemRepositoryFactory,
		)();

		let maintenance: boolean | undefined;
		let refresh: Promise<void> | undefined;
		let refreshedAt = 0;

		const read = async (): Promise<void> => {
			let cutoff: NodeJS.Timeout | undefined;
			try {
				maintenance = await Promise.race([
					systemRepository.inMaintenance(),
					new Promise<never>((_resolve, reject) => {
						cutoff = setTimeout(() => reject(new Error(readTimedOut)), readTimeout);
					}),
				]);
				refreshedAt = Date.now();
			} catch (error) {
				if (maintenance === undefined || !isTimeout(error)) {
					maintenance = true;
				}
			} finally {
				clearTimeout(cutoff);
			}
		};

		const inMaintenance = async (): Promise<boolean> => {
			if (!refresh && Date.now() - refreshedAt >= refreshInterval) {
				refresh = read().finally(() => {
					refresh = undefined;
				});
			}

			if (maintenance === undefined) {
				await refresh;
			}

			return maintenance === true;
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
