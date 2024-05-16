import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers, Utils } from "@mainsail/kernel";

import { constants } from "./constants.js";
import { Routes, SocketErrors } from "./enums.js";
// eslint-disable-next-line import/no-namespace
import * as replySchemas from "./reply-schemas/index.js";
import { Codecs } from "./socket-server/codecs/index.js";
import { Throttle } from "./throttle.js";

// @TODO review the implementation
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

	#throttle?: Throttle;

	public async postProposal(peer: Contracts.P2P.Peer, proposal: Buffer): Promise<void> {
		try {
			await this.emit(peer, Routes.PostProposal, { proposal }, { timeout: 2000 });
		} catch (error) {
			this.handleSocketError(peer, error);
		}
	}

	public async postPrevote(peer: Contracts.P2P.Peer, prevote: Buffer): Promise<void> {
		try {
			await this.emit(peer, Routes.PostPrevote, { prevote }, { timeout: 2000 });
		} catch (error) {
			this.handleSocketError(peer, error);
		}
	}

	public async postPrecommit(peer: Contracts.P2P.Peer, precommit: Buffer): Promise<void> {
		try {
			await this.emit(peer, Routes.PostPrecommit, { precommit }, { timeout: 2000 });
		} catch (error) {
			this.handleSocketError(peer, error);
		}
	}

	public async pingPorts(peer: Contracts.P2P.Peer): Promise<void> {
		await Promise.all(
			Object.entries(peer.plugins).map(async ([name, plugin]) => {
				peer.ports[name] = -1;
				try {
					const { statusCode } = await Utils.http.head(`http://${peer.ip}:${plugin.port}/`);

					if (statusCode === 200) {
						peer.ports[name] = plugin.port;
					}
				} catch {}
			}),
		);
	}

	public async getMessages(peer: Contracts.P2P.Peer): Promise<Contracts.P2P.GetMessagesResponse> {
		return this.emit(peer, Routes.GetMessages, {}, { timeout: 5000 });
	}

	public async getProposal(peer: Contracts.P2P.Peer): Promise<Contracts.P2P.GetProposalResponse> {
		return this.emit(peer, Routes.GetProposal, {}, { timeout: 5000 });
	}

	public async getPeers(peer: Contracts.P2P.Peer): Promise<Contracts.P2P.GetPeersResponse> {
		this.logger.debug(`Fetching a fresh peer list from ${peer.url}`);
		return this.emit(peer, Routes.GetPeers, {}, { timeout: 5000 });
	}

	public async getApiNodes(peer: Contracts.P2P.Peer): Promise<Contracts.P2P.GetApiNodesResponse> {
		this.logger.debug(`Fetching API nodes from ${peer.url}`);
		return this.emit(peer, Routes.GetApiNodes, {}, { timeout: 5000 });
	}

	public async getStatus(
		peer: Contracts.P2P.Peer,
		options: Partial<Contracts.P2P.EmitOptions> = {},
	): Promise<Contracts.P2P.GetStatusResponse> {
		return this.emit<Contracts.P2P.GetStatusResponse>(peer, Routes.GetStatus, {}, { timeout: 5000, ...options });
	}

	public async getBlocks(
		peer: Contracts.P2P.Peer,
		{ fromHeight, limit = constants.MAX_DOWNLOAD_BLOCKS }: { fromHeight: number; limit?: number },
		options: Partial<Contracts.P2P.EmitOptions> = {},
	): Promise<Contracts.P2P.GetBlocksResponse> {
		const result = await this.emit<Contracts.P2P.GetBlocksResponse>(
			peer,
			Routes.GetBlocks,
			{
				fromHeight,
				limit,
			},
			{
				timeout: this.configuration.getRequired<number>("getBlocksTimeout"),
				...options,
			},
		);

		if (result.blocks.length === 0) {
			this.logger.debug(`Peer ${peer.ip} did not return any blocks via height ${fromHeight.toLocaleString()}.`);
		}

		return result;
	}

	private validateReply(peer: Contracts.P2P.Peer, reply: any, endpoint: string) {
		const schema = replySchemas[endpoint];
		if (schema === undefined) {
			this.logger.error(`Can't validate reply from "${endpoint}": none of the predefined schemas matches.`);
			return false;
		}

		const { error } = this.validator.validate(schema, reply);
		if (error) {
			this.logger.debugExtra(`Got unexpected reply from ${peer.url}/${endpoint}: ${error}`);

			return false;
		}

		return true;
	}

	private async emit<T extends Contracts.P2P.Response>(
		peer: Contracts.P2P.Peer,
		event: Routes,
		payload: any,
		options: Contracts.P2P.EmitOptions,
	): Promise<T> {
		options = {
			...options,
		};

		const throttle = await this.#getThrottle();
		await throttle.throttle(peer, event);

		const codec = Codecs[event];

		const timeBeforeSocketCall: number = Date.now();

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
		const parsedResponsePayload = codec.response.deserialize(response.payload) as T;

		peer.latency = Date.now() - timeBeforeSocketCall;

		if (!this.validateReply(peer, parsedResponsePayload, event)) {
			const validationError = new Error(
				`Response validation failed from peer ${peer.ip} : ${JSON.stringify(parsedResponsePayload)}`,
			);
			validationError.name = SocketErrors.Validation;
			throw validationError;
		}

		Utils.assert.defined(parsedResponsePayload.headers);
		void this.headerService.handle(peer, parsedResponsePayload.headers);

		return parsedResponsePayload;
	}

	private handleSocketError(peer: Contracts.P2P.Peer, error: Error): void {
		this.app.get<Contracts.P2P.PeerDisposer>(Identifiers.P2P.Peer.Disposer).banPeer(peer.ip, error);
	}

	async #getThrottle(): Promise<Throttle> {
		if (!this.#throttle) {
			this.#throttle = await this.throttleFactory();
		}

		return this.#throttle;
	}
}
