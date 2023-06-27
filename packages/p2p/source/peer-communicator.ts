import { inject, injectable, postConstruct, tagged } from "@mainsail/container";
import { Constants, Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import { Providers, Utils } from "@mainsail/kernel";
import dayjs from "dayjs";
import delay from "delay";

import { constants } from "./constants";
import { Routes, SocketErrors } from "./enums";
import { Header } from "./header";
import { PeerVerifier } from "./peer-verifier";
import { RateLimiter } from "./rate-limiter";
import { replySchemas } from "./reply-schemas";
import { Codecs } from "./socket-server/codecs";
import { buildRateLimiter, isValidVersion } from "./utils";

// @TODO review the implementation
@injectable()
export class PeerCommunicator implements Contracts.P2P.PeerCommunicator {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.PluginConfiguration)
	@tagged("plugin", "p2p")
	private readonly configuration!: Providers.PluginConfiguration;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly cryptoConfiguration!: Contracts.Crypto.IConfiguration;

	@inject(Identifiers.PeerConnector)
	private readonly connector!: Contracts.P2P.PeerConnector;

	@inject(Identifiers.PeerHeader)
	private readonly header!: Header;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.Cryptography.Validator)
	private readonly validator!: Contracts.Crypto.IValidator;

	#outgoingRateLimiter!: RateLimiter;

	@postConstruct()
	public initialize(): void {
		this.#outgoingRateLimiter = buildRateLimiter({
			rateLimit: this.configuration.getOptional<number>("rateLimit", 100),

			rateLimitPostTransactions: this.configuration.getOptional<number>("rateLimitPostTransactions", 25),

			remoteAccess: [],
			// White listing anybody here means we would not throttle ourselves when sending
			// them requests, ie we could spam them.
			whitelist: [],
		});
	}

	public async postTransactions(peer: Contracts.P2P.Peer, transactions: Buffer[]): Promise<void> {
		const postTransactionsTimeout = 10_000;
		const postTransactionsRateLimit = this.configuration.getOptional<number>("rateLimitPostTransactions", 25);

		const queue = await peer.getTransactionsQueue();
		void queue.resume();
		void queue.push({
			handle: async () => {
				await this.emit(peer, Routes.PostTransactions, { transactions }, postTransactionsTimeout);
				await delay(Math.ceil(1000 / postTransactionsRateLimit));
				// to space up between consecutive calls to postTransactions according to rate limit
				// optimized here because default throttling would not be effective for postTransactions
			},
		});
	}

	public async postProposal(peer: Contracts.P2P.Peer, proposal: Buffer): Promise<void> {
		await this.emit(peer, Routes.PostProposal, { proposal }, 10_000);
	}

	public async postPrevote(peer: Contracts.P2P.Peer, prevote: Buffer): Promise<void> {
		await this.emit(peer, Routes.PostPrevote, { prevote }, 10_000);
	}

	public async postPrecommit(peer: Contracts.P2P.Peer, precommit: Buffer): Promise<void> {
		await this.emit(peer, Routes.PostPrecommit, { precommit }, 10_000);
	}

	// ! do not rely on parameter timeoutMsec as guarantee that ping method will resolve within it !
	// ! peerVerifier.checkState can take more time !
	// TODO refactor ?
	public async ping(peer: Contracts.P2P.Peer, timeoutMsec: number, force = false): Promise<any> {
		const deadline = Date.now() + timeoutMsec;

		if (peer.recentlyPinged() && !force) {
			return undefined;
		}

		const getStatusTimeout = timeoutMsec < 5000 ? timeoutMsec : 5000;
		const pingResponse: Contracts.P2P.PeerPingResponse = await this.emit(
			peer,
			Routes.GetStatus,
			{},
			getStatusTimeout,
		);

		if (!pingResponse) {
			throw new Exceptions.PeerStatusResponseError(peer.ip);
		}

		if (process.env[Constants.Flags.CORE_SKIP_PEER_STATE_VERIFICATION] !== "true") {
			if (!this.#validatePeerConfig(peer, pingResponse.config)) {
				throw new Exceptions.PeerVerificationFailedError();
			}

			const peerVerifier = this.app.resolve(PeerVerifier).initialize(peer);

			if (deadline <= Date.now()) {
				throw new Exceptions.PeerPingTimeoutError(timeoutMsec);
			}

			peer.verificationResult = await peerVerifier.checkState(pingResponse.state, deadline);

			if (!peer.isVerified()) {
				throw new Exceptions.PeerVerificationFailedError();
			}
		}

		peer.lastPinged = dayjs();
		peer.state = pingResponse.state;
		peer.plugins = pingResponse.config.plugins;

		return pingResponse.state;
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

	public async getMessages(peer: Contracts.P2P.Peer): Promise<Contracts.P2P.IGetMessagesResponse> {
		return this.emit(peer, Routes.GetMessages, {}, 5000);
	}

	public async getProposal(peer: Contracts.P2P.Peer): Promise<Contracts.P2P.IGetProposalResponse> {
		return this.emit(peer, Routes.GetProposal, {}, 5000);
	}

	public async getPeers(peer: Contracts.P2P.Peer): Promise<Contracts.P2P.IGetPeersResponse> {
		this.logger.debug(`Fetching a fresh peer list from ${peer.url}`);

		const getPeersTimeout = 5000;
		return this.emit(peer, Routes.GetPeers, {}, getPeersTimeout);
	}

	public async hasCommonBlocks(peer: Contracts.P2P.Peer, ids: string[], timeoutMsec?: number): Promise<any> {
		const getCommonBlocksTimeout = timeoutMsec && timeoutMsec < 5000 ? timeoutMsec : 5000;
		const body: any = await this.emit(peer, Routes.GetCommonBlocks, { ids }, getCommonBlocksTimeout);

		if (!body || !body.common) {
			return false;
		}

		return body.common;
	}

	public async getBlocks(
		peer: Contracts.P2P.Peer,
		{ fromHeight, limit = constants.MAX_DOWNLOAD_BLOCKS }: { fromHeight: number; limit?: number },
	): Promise<Buffer[]> {
		const maxPayload = constants.DEFAULT_MAX_PAYLOAD;

		const result = await this.emit(
			peer,
			Routes.GetBlocks,
			{
				fromHeight,
				limit,
			},
			this.configuration.getRequired<number>("getBlocksTimeout"),
			maxPayload,
			false, //TODO: check why this is false
		);

		if (result.blocks.length === 0) {
			this.logger.debug(`Peer ${peer.ip} did not return any blocks via height ${fromHeight.toLocaleString()}.`);
		}

		return result;
	}

	#validatePeerConfig(peer: Contracts.P2P.Peer, config: Contracts.P2P.PeerConfig): boolean {
		if (config.network.nethash !== this.cryptoConfiguration.get("network.nethash")) {
			return false;
		}

		peer.version = config.version;

		if (!isValidVersion(this.app, peer)) {
			return false;
		}

		return true;
	}

	private async validateReply(peer: Contracts.P2P.Peer, reply: any, endpoint: string) {
		const schema = replySchemas[endpoint];
		if (schema === undefined) {
			this.logger.error(`Can't validate reply from "${endpoint}": none of the predefined schemas matches.`);
			return false;
		}

		const { error } = await this.validator.validate(schema, reply);
		if (error) {
			if (process.env.CORE_P2P_PEER_VERIFIER_DEBUG_EXTRA) {
				this.logger.debug(`Got unexpected reply from ${peer.url}/${endpoint}: ${error}`);
			}

			return false;
		}

		return true;
	}

	private async emit(
		peer: Contracts.P2P.Peer,
		event: Routes,
		payload: any,
		timeout?: number,
		maxPayload?: number,
		disconnectOnError = true,
	) {
		await this.throttle(peer, event);

		const codec = Codecs[event];

		let response;
		let parsedResponsePayload;
		try {
			this.connector.forgetError(peer);

			const timeBeforeSocketCall: number = Date.now();

			maxPayload = maxPayload || constants.DEFAULT_MAX_PAYLOAD_CLIENT;
			await this.connector.connect(peer, maxPayload);

			response = await this.connector.emit(
				peer,
				event,
				codec.request.serialize({
					...payload,
					headers: {
						...(await this.header.getHeader()),
					},
				}),
				timeout,
			);
			parsedResponsePayload = codec.response.deserialize(response.payload);

			peer.sequentialErrorCounter = 0; // reset counter if response is successful, keep it after emit

			peer.latency = Date.now() - timeBeforeSocketCall;

			if (!this.validateReply(peer, parsedResponsePayload, event)) {
				const validationError = new Error(
					`Response validation failed from peer ${peer.ip} : ${JSON.stringify(parsedResponsePayload)}`,
				);
				validationError.name = SocketErrors.Validation;
				throw validationError;
			}
		} catch (error) {
			await this.handleSocketError(peer, event, error, disconnectOnError);
			return;
		}

		return parsedResponsePayload;
	}

	private async throttle(peer: Contracts.P2P.Peer, event: string): Promise<void> {
		const msBeforeReCheck = 1000;
		while (await this.#outgoingRateLimiter.hasExceededRateLimitNoConsume(peer.ip, event)) {
			this.logger.debug(
				`Throttling outgoing requests to ${peer.ip}/${event} to avoid triggering their rate limit`,
			);
			await delay(msBeforeReCheck);
		}
		try {
			await this.#outgoingRateLimiter.consume(peer.ip, event);
		} catch {
			//@ts-ignore
		}
	}

	private async handleSocketError(
		peer: Contracts.P2P.Peer,
		event: string,
		error: Error,
		disconnect = true,
	): Promise<void> {
		if (!error.name) {
			return;
		}

		const processor = this.app.get<Contracts.P2P.PeerProcessor>(Identifiers.PeerProcessor);

		this.connector.setError(peer, error.name);
		peer.sequentialErrorCounter++;
		if (peer.sequentialErrorCounter >= this.configuration.getRequired<number>("maxPeerSequentialErrors")) {
			await processor.dispose(peer);
		}

		switch (error.name) {
			case SocketErrors.Validation:
				this.logger.debug(`Socket data validation error (peer ${peer.ip}) : ${error.message}`);
				break;
			case "Error":
				if (process.env.CORE_P2P_PEER_VERIFIER_DEBUG_EXTRA) {
					this.logger.debug(`Response error (peer ${peer.ip}/${event}) : ${error.message}`);
				}
				break;
			default:
				if (process.env.CORE_P2P_PEER_VERIFIER_DEBUG_EXTRA) {
					this.logger.debug(`Socket error (peer ${peer.ip}) : ${error.message}`);
				}

				if (disconnect) {
					await processor.dispose(peer);
				}
		}
	}
}
