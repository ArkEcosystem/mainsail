import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { Types } from "@arkecosystem/core-kernel";
import fastify, { FastifyInstance } from "fastify";
import { v4 } from "uuid";

@injectable()
export class Server {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	#options: Record<string, any>;
	#server: FastifyInstance;
	#address: string;

	public async initialize(options: Types.JsonObject): Promise<FastifyInstance> {
		this.#options = options;

		this.#server = fastify({
			bodyLimit: 2_097_152,
			disableRequestLogging: true,
			genReqId: () => v4(),
			logger: false,
		});

		return this.#server;
	}

	public async boot(): Promise<void> {
		try {
			// @ts-ignore
			this.#address = await this.#server.listen(this.#options.port, this.#options.host);

			this.logger.info(`Transaction Pool API server listening on ${this.#address}`);
		} catch {
			await this.app.terminate(`Failed to start Transaction Pool API!`);
		}
	}

	public async dispose(): Promise<void> {
		try {
			await this.#server.close();

			this.logger.info(`Terminated Transaction Pool API server listening on ${this.#address}`);
		} catch {
			await this.app.terminate(`Failed to stop Transaction Pool API!`);
		}
	}
}
