import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers, Services, Utils } from "@mainsail/kernel";
import Joi from "joi";

import { RevalidateApiNodeAction, ValidateAndAcceptApiNodeAction, ValidateAndAcceptPeerAction } from "./actions";
import { Broadcaster } from "./broadcaster";
import { BlockDownloader } from "./downloader/block-downloader";
import { MessageDownloader } from "./downloader/message-downloader";
import { ProposalDownloader } from "./downloader/proposal-downloader";
import { Header } from "./header";
import { HeaderService } from "./header-service";
import { Logger } from "./logger";
import { Peer } from "./peer";
import { PeerApiNodeDiscoverer } from "./peer-api-node-discoverer";
import { PeerApiNodeProcessor } from "./peer-api-node-processor";
import { PeerApiNode, PeerApiNodeRepository } from "./peer-api-node-repository";
import { PeerApiNodeVerifier } from "./peer-api-node-verifier";
import { PeerCommunicator } from "./peer-communicator";
import { PeerConnector } from "./peer-connector";
import { PeerDiscoverer } from "./peer-discoverer";
import { PeerDisposer } from "./peer-disposer";
import { PeerProcessor } from "./peer-processor";
import { PeerRepository } from "./peer-repository";
import { PeerVerifier } from "./peer-verifier";
import { Service } from "./service";
import { Server } from "./socket-server/server";
import { State } from "./state";
import { Throttle } from "./throttle";
import { makeFormats, makeKeywords, sanitizeRemoteAddress } from "./validation";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.#registerValidation();

		this.#registerFactories();

		this.#registerServices();

		this.#registerActions();
	}

	public async boot(): Promise<void> {
		await this.#buildServer();
	}

	public async dispose(): Promise<void> {
		await this.app.get<Contracts.P2P.Service>(Identifiers.P2P.Service).dispose();
		await this.app.get<Contracts.P2P.Server>(Identifiers.P2P.Server).dispose();
		await this.app.get<Contracts.P2P.PeerDisposer>(Identifiers.P2P.Peer.Disposer).disposePeers();
	}

	public async required(): Promise<boolean> {
		return true;
	}

	public configSchema(): Joi.AnySchema {
		return Joi.object({
			apiNodes: Joi.array().items(Joi.string()).default([]),
			apiNodesMaxContentLength: Joi.number().integer().min(0).required(),
			blacklist: Joi.array().items(Joi.string()).required(),
			developmentMode: Joi.object({
				enabled: Joi.bool().required(),
			}).required(),
			disableDiscovery: Joi.bool(),
			getBlocksTimeout: Joi.number().integer().min(0).required(),
			ignoreMinimumNetworkReach: Joi.bool(),
			maxPeersBroadcast: Joi.number().integer().min(0).required(),
			maxSameSubnetPeers: Joi.number().integer().min(0).required(),
			minimumNetworkReach: Joi.number().integer().min(0).required(),
			minimumVersions: Joi.array().items(Joi.string()).required(),
			peerBanTime: Joi.number().integer().min(0).required(),
			rateLimit: Joi.number().integer().min(1).required(),
			rateLimitPostTransactions: Joi.number().integer().min(1).required(),
			remoteAccess: Joi.array()
				.items(Joi.string().ip({ version: ["ipv4", "ipv6"] }))
				.required(),
			server: Joi.object({
				hostname: Joi.string()
					.ip({ version: ["ipv4", "ipv6"] })
					.required(),
				logLevel: Joi.number().integer().min(0).required(),
				port: Joi.number().integer().min(1).max(65_535).required(), // TODO: Check
			}).required(),
			skipDiscovery: Joi.bool(),
			verifyTimeout: Joi.number().integer().min(0).required(),
			whitelist: Joi.array().items(Joi.string()).required(),
		}).unknown(true);
	}

	#registerFactories(): void {
		this.app.bind(Identifiers.P2P.Peer.Factory).toFactory<Peer, [string]>(() => (ip: string) => {
			const sanitizedIp = sanitizeRemoteAddress(ip);
			Utils.assert.defined<string>(sanitizedIp);

			return this.app.resolve(Peer).init(sanitizedIp, Number(this.config().getRequired<number>("server.port")));
		});

		this.app
			.bind(Identifiers.P2P.ApiNode.Factory)
			.toFactory<PeerApiNode, [string, string | number, Contracts.P2P.PeerProtocol?]>(
				() => (ip: string, port: string | number, protocol?: Contracts.P2P.PeerProtocol) => {
					const sanitizedIp = sanitizeRemoteAddress(ip);
					Utils.assert.defined<string>(sanitizedIp);
					return this.app.resolve(PeerApiNode).init(sanitizedIp, Number(port), protocol);
				},
			);

		this.app
			.bind(Identifiers.P2P.Header.Factory)
			.toFactory<Contracts.P2P.Header>(() => () => this.app.resolve(Header));
	}

	#registerServices(): void {
		this.app
			.bind(Identifiers.P2P.Throttle.Factory)
			.toFactory(() => async () => await this.app.resolve(Throttle).initialize());

		this.app.bind(Identifiers.P2P.Logger).to(Logger).inSingletonScope();

		this.app.bind(Identifiers.P2P.Peer.Repository).to(PeerRepository).inSingletonScope();

		this.app.bind(Identifiers.P2P.ApiNode.Repository).to(PeerApiNodeRepository).inSingletonScope();

		this.app.bind(Identifiers.P2P.ApiNode.Discoverer).to(PeerApiNodeDiscoverer).inSingletonScope();

		this.app.bind(Identifiers.P2P.ApiNode.Verifier).to(PeerApiNodeVerifier).inSingletonScope();

		this.app.bind(Identifiers.P2P.ApiNode.Processor).to(PeerApiNodeProcessor).inSingletonScope();

		this.app.bind(Identifiers.P2P.Peer.Connector).to(PeerConnector).inSingletonScope();

		this.app.bind(Identifiers.P2P.Peer.Communicator).to(PeerCommunicator).inSingletonScope();

		this.app.bind(Identifiers.P2P.Peer.Processor).to(PeerProcessor).inSingletonScope();

		this.app.bind(Identifiers.P2P.Peer.Disposer).to(PeerDisposer).inSingletonScope();

		this.app.bind(Identifiers.P2P.Peer.Verifier).to(PeerVerifier).inSingletonScope();

		this.app.bind(Identifiers.P2P.Header.Service).to(HeaderService).inSingletonScope();

		this.app.bind(Identifiers.P2P.Peer.Discoverer).to(PeerDiscoverer).inSingletonScope();

		this.app.bind(Identifiers.P2P.Downloader.Block).to(BlockDownloader).inSingletonScope();

		this.app.bind(Identifiers.P2P.Downloader.Proposal).to(ProposalDownloader).inSingletonScope();

		this.app.bind(Identifiers.P2P.Downloader.Message).to(MessageDownloader).inSingletonScope();

		this.app.bind(Identifiers.P2P.Service).to(Service).inSingletonScope();

		this.app.bind(Identifiers.P2P.Broadcaster).to(Broadcaster).inSingletonScope();

		this.app.bind(Identifiers.P2P.Server).to(Server).inSingletonScope();

		this.app.bind(Identifiers.P2P.State).to(State).inSingletonScope();
	}

	async #buildServer(): Promise<void> {
		const server = this.app.get<Contracts.P2P.Server>(Identifiers.P2P.Server);
		const serverConfig = this.config().getRequired<{ hostname: string; port: number }>("server");
		Utils.assert.defined(serverConfig);

		await server.initialize("P2P Server", serverConfig);
	}

	#registerActions(): void {
		this.app
			.get<Services.Triggers.Triggers>(Identifiers.Services.Trigger.Service)
			.bind("validateAndAcceptPeer", new ValidateAndAcceptPeerAction(this.app));

		this.app
			.get<Services.Triggers.Triggers>(Identifiers.Services.Trigger.Service)
			.bind("validateAndAcceptApiNode", new ValidateAndAcceptApiNodeAction(this.app));

		this.app
			.get<Services.Triggers.Triggers>(Identifiers.Services.Trigger.Service)
			.bind("revalidateApiNode", new RevalidateApiNodeAction(this.app));
	}

	#registerValidation(): void {
		for (const keyword of Object.values(makeKeywords())) {
			this.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator).addKeyword(keyword);
		}

		for (const [name, format] of Object.entries(makeFormats())) {
			this.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator).addFormat(name, format);
		}
	}
}
