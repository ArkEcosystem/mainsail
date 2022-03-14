import { inject, injectable, postConstruct, tagged } from "@arkecosystem/core-container";
import { Contracts, Exceptions, Identifiers } from "@arkecosystem/core-contracts";
import { Enums, Providers, Types, Utils } from "@arkecosystem/core-kernel";
import dayjs from "dayjs";
import delay from "delay";
import got from "got";

import { constants } from "./constants";
import { PeerVerifier } from "./peer-verifier";
import { RateLimiter } from "./rate-limiter";
import { replySchemas } from "./schemas";
import { buildRateLimiter, isValidVersion } from "./utils";

// @TODO review the implementation
@injectable()
export class PeerCommunicator implements Contracts.P2P.PeerCommunicator {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.PluginConfiguration)
	@tagged("plugin", "core-p2p")
	private readonly configuration!: Providers.PluginConfiguration;

	@inject(Identifiers.PeerConnector)
	private readonly connector!: Contracts.P2P.PeerConnector;

	@inject(Identifiers.EventDispatcherService)
	private readonly events!: Contracts.Kernel.EventDispatcher;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.QueueFactory)
	private readonly createQueue!: Types.QueueFactory;

	@inject(Identifiers.Cryptography.Block.Serializer)
	private readonly serializer: Contracts.Crypto.IBlockSerializer;

	@inject(Identifiers.Cryptography.Transaction.Factory)
	private readonly transactionFactory: Contracts.Crypto.ITransactionFactory;

	@inject(Identifiers.Cryptography.Validator)
	private readonly validator!: Contracts.Crypto.IValidator;

	#outgoingRateLimiter!: RateLimiter;

	#postTransactionsQueueByIp: Map<string, Contracts.Kernel.Queue> = new Map();

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

		this.events.listen(Enums.PeerEvent.Disconnect, {
			handle: ({ data }) => this.#postTransactionsQueueByIp.delete(data.peer.ip),
		});
	}

	public async postBlock(peer: Contracts.P2P.Peer, block: Contracts.Crypto.IBlock) {
		const response = await this.#post({
			json: {
				block: await this.serializer.serializeWithTransactions({
					...block.data,
					transactions: block.transactions.map((tx) => tx.data),
				}),
			},
			path: "blocks",
			peer,
			schema: replySchemas.postBlock,
		});

		if (response && response.height) {
			peer.state.height = response.height;
		}
	}

	public async postTransactions(peer: Contracts.P2P.Peer, transactions: Buffer[]): Promise<void> {
		const postTransactionsRateLimit = this.configuration.getOptional<number>("rateLimitPostTransactions", 25);

		if (!this.#postTransactionsQueueByIp.get(peer.ip)) {
			this.#postTransactionsQueueByIp.set(peer.ip, await this.createQueue());
		}

		const queue = this.#postTransactionsQueueByIp.get(peer.ip)!;
		queue.resume();
		queue.push({
			handle: async () => {
				await this.#post({
					json: { transactions },
					path: "transactions",
					peer,
					schema: replySchemas.postTransactions,
				});

				await delay(Math.ceil(1000 / postTransactionsRateLimit));
				// to space up between consecutive calls to postTransactions according to rate limit
				// optimized here because default throttling would not be effective for postTransactions
			},
		});
	}

	// ! do not rely on parameter timeoutMsec as guarantee that ping method will resolve within it !
	// ! peerVerifier.checkState can take more time !
	// TODO refactor ?
	public async ping(peer: Contracts.P2P.Peer, timeoutMsec: number, force = false): Promise<any> {
		const deadline = Date.now() + timeoutMsec;

		if (peer.recentlyPinged() && !force) {
			return undefined;
		}

		// const getStatusTimeout = timeoutMsec < 5000 ? timeoutMsec : 5000;
		const pingResponse: Contracts.P2P.PeerPingResponse = await this.#get({
			path: "status",
			peer,
			schema: replySchemas.getStatus,
		});

		if (!pingResponse) {
			throw new Exceptions.PeerStatusResponseError(peer.ip);
		}

		if (process.env.CORE_SKIP_PEER_STATE_VERIFICATION !== "true") {
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

	public async getPeers(peer: Contracts.P2P.Peer): Promise<Contracts.P2P.PeerBroadcast[]> {
		this.logger.debug(`Fetching a fresh peer list from ${peer.url}`);

		return this.#get({ path: "peers", peer, schema: replySchemas.getPeers });
	}

	public async hasCommonBlocks(peer: Contracts.P2P.Peer, ids: string[], timeoutMsec?: number): Promise<any> {
		const body: any = await this.#post({
			json: {
				ids,
			},
			path: "blocks/common",
			peer,
			schema: replySchemas.getCommonBlocks,
		});

		if (!body || !body.common) {
			return false;
		}

		return body.common;
	}

	public async getPeerBlocks(
		peer: Contracts.P2P.Peer,
		{
			fromBlockHeight,
			blockLimit = constants.MAX_DOWNLOAD_BLOCKS,
			headersOnly,
		}: { fromBlockHeight: number; blockLimit?: number; headersOnly?: boolean },
	): Promise<Contracts.Crypto.IBlockData[]> {
		// const maxPayload = headersOnly ? blockLimit * constants.KILOBYTE : constants.DEFAULT_MAX_PAYLOAD;

		const peerBlocks = await this.#get({
			path: "blocks",
			peer,
			schema: replySchemas.getBlocks,
			searchParams: {
				blockLimit,
				headersOnly,
				lastBlockHeight: fromBlockHeight,
				serialized: true,
			},
		});

		if (!peerBlocks || peerBlocks.length === 0) {
			this.logger.debug(
				`Peer ${peer.ip} did not return any blocks via height ${fromBlockHeight.toLocaleString()}.`,
			);
			return [];
		}

		for (const block of peerBlocks) {
			if (headersOnly) {
				// with headersOnly we still get block.transactions as empty array (protobuf deser) but in this case we actually
				// don't want the transactions as a property at all (because it would make validation fail)
				delete block.transactions;
				continue;
			}

			for (let index = 0; index < block.transactions.length; index++) {
				const { data } = await this.transactionFactory.fromBytes(Buffer.from(block.transactions[index], "hex"));
				data.blockId = block.id;

				block.transactions[index] = data;
			}
		}
		this.configuration;

		return peerBlocks;
	}

	#validatePeerConfig(peer: Contracts.P2P.Peer, config: Contracts.P2P.PeerConfig): boolean {
		if (config.network.nethash !== this.configuration.get("network.nethash")) {
			return false;
		}

		peer.version = config.version;

		if (!isValidVersion(this.app, peer)) {
			return false;
		}

		return true;
	}

	async #get<T = any>({
		peer,
		path,
		schema,
		searchParams,
	}: {
		peer: Contracts.P2P.Peer;
		path: string;
		schema: object;
		searchParams?;
	}): Promise<T> {
		const url: string = this.#requestUrl(peer, path);

		return this.#sendRequest({
			peer,
			request: async () =>
				got
					.get(url, {
						headers: {
							version: this.app.version(),
						},
						searchParams,
						timeout: this.configuration.getRequired<number>("getBlocksTimeout"),
					})
					.json(),
			schema,
			url,
		});
	}

	async #post<T = any>({
		peer,
		path,
		schema,
		json,
		searchParams,
	}: {
		peer: Contracts.P2P.Peer;
		path: string;
		schema: object;
		json: object;
		searchParams?;
	}): Promise<T> {
		const url: string = this.#requestUrl(peer, path);

		return this.#sendRequest({
			peer,
			request: async () =>
				got
					.post(url, {
						headers: {
							version: this.app.version(),
						},
						json,
						searchParams,
						timeout: this.configuration.getRequired<number>("getBlocksTimeout"),
					})
					.json(),
			schema,
			url,
		});
	}

	async #sendRequest<T = any>({
		peer,
		url,
		schema,
		request,
	}: {
		peer: Contracts.P2P.Peer;
		url: string;
		schema: object;
		request: any;
	}): Promise<T> {
		// Throttle
		const msBeforeReCheck = 1000;

		while (await this.#outgoingRateLimiter.hasExceededRateLimitNoConsume(peer.ip, url)) {
			this.logger.debug(`Throttling outgoing requests to ${peer.ip}/${url} to avoid triggering their rate limit`);

			await delay(msBeforeReCheck);
		}

		try {
			await this.#outgoingRateLimiter.consume(peer.ip, url);
		} catch {
			//@ts-ignore
		}

		// Request
		try {
			this.connector.forgetError(peer);

			const timeBeforeSocketCall: number = Date.now();

			await this.connector.connect(peer);
			// constants.DEFAULT_MAX_PAYLOAD_CLIENT

			const parsedResponsePayload: any = await request();

			peer.sequentialErrorCounter = 0; // reset counter if response is successful, keep it after emit
			peer.latency = Date.now() - timeBeforeSocketCall;

			if (parsedResponsePayload.headers && parsedResponsePayload.headers.height) {
				peer.state.height = +parsedResponsePayload.headers.height;
			}

			// Validate
			const { error, errors } = await this.validator.validate(schema, parsedResponsePayload);

			if (error) {
				this.logger.info(`Got unexpected reply from ${url}: ${JSON.stringify(errors)}`);

				throw new Error(`Response validation failed from peer ${peer.ip} : ${JSON.stringify(errors)}`);
			}

			// // Validate
			// this.validator.validate(parsedResponsePayload, schema);

			// if (this.validator.fails()) {
			// 	this.logger.debug(`Got unexpected reply from ${url}: ${JSON.stringify(this.validator.errors())}`);

			// 	const validationError = new Error(
			// 		`Response validation failed from peer ${peer.ip} : ${JSON.stringify(parsedResponsePayload)}`,
			// 	);

			// 	throw validationError;
			// }

			return parsedResponsePayload as T;
		} catch (error) {
			this.connector.setError(peer, error.name);

			peer.sequentialErrorCounter++;

			if (peer.sequentialErrorCounter >= this.configuration.getRequired<number>("maxPeerSequentialErrors")) {
				this.events.dispatch(Enums.PeerEvent.Disconnect, { peer });
			}

			throw error;
		}
	}

	#requestUrl(peer: Contracts.P2P.Peer, path: string): string {
		return `http://${peer.ip}:4002/${path}`;
	}
}
