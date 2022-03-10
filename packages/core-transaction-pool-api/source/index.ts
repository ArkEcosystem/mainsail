import { Identifiers } from "@arkecosystem/core-contracts";
import { Providers } from "@arkecosystem/core-kernel";
import { FastifyInstance, FastifyRequest } from "fastify";

import { Handlers } from "./contracts";
import { SubmitTransactionHandler } from "./handlers/submit";
import { Server } from "./server";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Handlers.Store).to(SubmitTransactionHandler).inSingletonScope();

		this.app.bind(Identifiers.TransactionPoolServer).to(Server).inSingletonScope();

		await this.#registerHandlers();
	}

	public async boot(): Promise<void> {
		await this.app.get<Server>(Identifiers.TransactionPoolServer).boot();
	}

	public async dispose(): Promise<void> {
		// await this.app.get<Server>(Identifiers.TransactionPoolServer).dispose();
	}

	async #registerHandlers(): Promise<void> {
		const server: FastifyInstance = await this.app
			.get<Server>(Identifiers.TransactionPoolServer)
			.initialize(this.config().all());

		server.post(
			"/",
			{
				schema: {
					body: {
						properties: {
							//
						},
						type: "object",
					},
				},
			},
			async (request: FastifyRequest) => this.app.get<SubmitTransactionHandler>(Handlers.Store).invoke(request),
		);
	}
}
