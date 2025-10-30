import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";
import { assert, http } from "@mainsail/utils";
import { performance } from "perf_hooks";

import { constants } from "./constants.js";
import { Routes, SocketErrors } from "./enums.js";
import { replySchemas } from "./reply-schemas/index.js";
import { Codecs } from "./socket-server/codecs/index.js";
import { Throttle } from "./throttle.js";

@injectable()
export class PeerCommunicator implements Contracts.P2P.PeerCommunicator {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.ServiceProvider.Configuration)
	@tagged("plugin", "p2p")
	private readonly configuration!: Providers.PluginConfiguration;

	@inject(Identifiers.P2P.Peer.Connector)
	private readonly connector!: Contracts.P2P.PeerConnector;

	@inject(Identifiers.P2P.Header.Factory)
	private readonly headerFactory!: Contracts.P2P.HeaderFactory;

	@inject(Identifiers.P2P.Header.Service)
	private readonly headerService!: Contracts.P2P.HeaderService;

	@inject(Identifiers.P2P.Logger)
	private readonly logger!: Contracts.P2P.Logger;

	@inject(Identifiers.Cryptography.Validator)
	private readonly validator!: Contracts.Crypto.Validator;

	@inject(Identifiers.P2P.Throttle.Factory)
	private readonly throttleFactory!: () => Promise<Throttle>;

	@inject(Identifiers.P2P.Statistic.Service)
	private readonly statisticService!: Contracts.P2P.StatisticService;

	#throttle?: Throttle;

	public async postProposal(peer: Contracts.P2P.Peer, proposal: Buffer): Promise<void> {
		try {
			await this.#emit(peer, Routes.PostProposal, { proposal }, { timeout: 6000 });
		} catch (error) {
			this.#handleSocketError(peer, error);
		}
	}

	public async postPrevote(peer: Contracts.P2P.Peer, prevote: Buffer): Promise<void> {
		try {
			await this.#emit(peer, Routes.PostPrevote, { prevote }, { timeout: 6000 });
		} catch (error) {
			this.#handleSocketError(peer, error);
		}
	}

	public async postPrecommit(peer: Contracts.P2P.Peer, precommit: Buffer): Promise<void> {
		try {
			await this.#emit(peer, Routes.PostPrecommit, { precommit }, { timeout: 6000 });
		} catch (error) {
			this.#handleSocketError(peer, error);
		}
	}

	public async pingPorts(peer: Contracts.P2P.Peer): Promise<void> {
		await Promise.all(
			Object.entries(peer.plugins).map(async ([name, plugin]) => {
				peer.ports[name] = -1;
				try {
					const { statusCode } = await http.head(`http://${peer.ip}:${plugin.port}/`);

					if (statusCode === 200) {
						peer.ports[name] = plugin.port;
					}
				} catch {
					// empty
				}
			}),
		);
	}

	public async getMessages(peer: Contracts.P2P.Peer): Promise<Contracts.P2P.GetMessagesResponse> {
		const response = await this.#emit<Contracts.P2P.GetMessagesResponse>(
			peer,
			Routes.GetMessages,
			{},
			{ timeout: 5000 },
		);
		return response.data;
	}

	public async getProposal(peer: Contracts.P2P.Peer): Promise<Contracts.P2P.GetProposalResponse> {
		const response = await this.#emit<Contracts.P2P.GetProposalResponse>(
			peer,
			Routes.GetProposal,
			{},
			{ timeout: 5000 },
		);
		return response.data;
	}

	public async getPeers(peer: Contracts.P2P.Peer): Promise<Contracts.P2P.GetPeersResponse> {
		this.logger.debug(`Fetching a fresh peer list from ${peer.url}`, "p2p");

		const response = await this.#emit<Contracts.P2P.GetPeersResponse>(peer, Routes.GetPeers, {}, { timeout: 5000 });
		return response.data;
	}

	public async getApiNodes(peer: Contracts.P2P.Peer): Promise<Contracts.P2P.GetApiNodesResponse> {
		this.logger.debug(`Fetching API nodes from ${peer.url}`);
		const response = await this.#emit<Contracts.P2P.GetApiNodesResponse>(
			peer,
			Routes.GetApiNodes,
			{},
			{ timeout: 5000 },
		);
		return response.data;
	}

	public async getStatus(
		peer: Contracts.P2P.Peer,
		options: Partial<Contracts.P2P.EmitOptions> = {},
	): Promise<Contracts.P2P.GetStatusResponse> {
		const response = await this.#emit<Contracts.P2P.GetStatusResponse>(
			peer,
			Routes.GetStatus,
			{},
			{ timeout: 5000, ...options },
		);
		return response.data;
	}

	public async getBlocks(
		peer: Contracts.P2P.Peer,
		{ fromBlockNumber, limit = constants.MAX_DOWNLOAD_BLOCKS }: { fromBlockNumber: number; limit?: number },
		options: Partial<Contracts.P2P.EmitOptions> = {},
	): Promise<Contracts.P2P.GetBlocksResponse> {
		const result = await this.#emit<Contracts.P2P.GetBlocksResponse>(
			peer,
			Routes.GetBlocks,
			{
				fromBlockNumber,
				limit,
			},
			{
				timeout: this.configuration.getRequired<number>("getBlocksTimeout"),
				...options,
			},
		);

		if (result.data.blocks.length === 0) {
			this.logger.debug(
				`Peer ${peer.ip} did not return any blocks via block number ${fromBlockNumber.toLocaleString()}.`,
				"p2p",
			);
		}

		return result.data;
	}

	#validateReply(peer: Contracts.P2P.Peer, reply: any, endpoint: string) {
		const schema = replySchemas[endpoint];
		if (schema === undefined) {
			this.logger.error(
				`Can't validate reply from "${endpoint}": none of the predefined schemas matches.`,
				"p2p",
			);
			return false;
		}

		const { error } = this.validator.validate(schema, reply);
		if (error) {
			this.logger.debugExtra(`Got unexpected reply from ${peer.url}/${endpoint}: ${error}`, "p2p");

			return false;
		}

		return true;
	}

	async #emit<T extends Contracts.P2P.Response>(
		peer: Contracts.P2P.Peer,
		event: Routes,
		payload: any,
		options: Contracts.P2P.EmitOptions,
	): Promise<Contracts.P2P.EmitResult<T>> {
		const statistic: Contracts.P2P.EmitStatistic = {
			deserializeTime: 0,
			responseTime: 0,
			success: false,
			throttleTime: 0,
		};

		try {
			// Throttle
			const timeBeforeThrottle = performance.now();

			const throttle = await this.#getThrottle();
			await throttle.throttle(peer, event);

			statistic.throttleTime = Math.round(performance.now() - timeBeforeThrottle);

			// Emit
			const codec = Codecs[event];

			const timeBeforeSocketCall = performance.now();

			await this.connector.connect(peer);

			const response = await this.connector.emit(
				peer,
				event,
				codec.request.serialize({
					...payload,
					headers: {
						...this.headerFactory().toData(),
					},
				}),
				options.timeout,
			);
			statistic.responseTime = Math.round(performance.now() - timeBeforeSocketCall);

			// Deserialize
			const timeBeforeDeserialize = performance.now();

			const data = codec.response.deserialize(response.payload) as T;

			statistic.deserializeTime = Math.round(performance.now() - timeBeforeDeserialize);

			// Validate
			peer.setPinged(Math.floor(statistic.responseTime + statistic.deserializeTime));

			if (!this.#validateReply(peer, data, event)) {
				const validationError = new Error(
					`Response validation failed for ${event} from peer ${peer.ip}: ${JSON.stringify(data)}`,
				);

				validationError.name = SocketErrors.Validation;
				throw validationError;
			}

			assert.defined(data.headers);
			void this.headerService.handle(peer, data.headers);

			statistic.success = true;

			return { data, ...statistic };
		} finally {
			this.statisticService.getCurrentRoundStatistic().addEmit(peer.ip, event, statistic);
		}
	}

	#handleSocketError(peer: Contracts.P2P.Peer, error: Error): void {
		this.app.get<Contracts.P2P.PeerDisposer>(Identifiers.P2P.Peer.Disposer).banPeer(peer.ip, error);
	}

	async #getThrottle(): Promise<Throttle> {
		if (!this.#throttle) {
			this.#throttle = await this.throttleFactory();
		}

		return this.#throttle;
	}
}
