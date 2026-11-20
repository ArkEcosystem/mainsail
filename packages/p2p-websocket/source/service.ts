import type { Contracts } from "@mainsail/contracts";

import { Events, Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";

import type { BanList } from "./ban-list.js";
import type { ConnectionRepository } from "./connection-repository.js";
import type { Dialer } from "./dialer.js";
import type { Connection, Route } from "./interfaces/index.js";
import type { Listener } from "./listener.js";
import type { Router } from "./router.js";
import type { Server } from "./server.js";

import { CloseReason } from "./enums.js";
import { isValidVersion } from "./is-valid-version.js";

// The one object the p2p layer talks to. It delegates: lifecycle to the server, routes to the
// router, inbound sockets to the listener, outbound ones to the dialer, bans to the ban list.
// Whom to refuse before the handshake is decided by the connection verifiers, whom to ban by the
// caller through `ban`; connections reach the caller only through `onConnection`, never before
// their handshake is done. The versions of the software we connect with are checked in the handshake
// and again here whenever a milestone begins, as it may name other versions.
@injectable()
export class Service {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Services.EventDispatcher.Service)
	private readonly events!: Contracts.Kernel.EventDispatcher;

	@inject(Identifiers.P2P.WebSocket.Server)
	private readonly server!: Server;

	@inject(Identifiers.P2P.WebSocket.Router)
	private readonly router!: Router;

	@inject(Identifiers.P2P.WebSocket.Listener)
	private readonly listener!: Listener;

	@inject(Identifiers.P2P.WebSocket.Dialer)
	private readonly dialer!: Dialer;

	@inject(Identifiers.P2P.WebSocket.BanList)
	private readonly banList!: BanList;

	@inject(Identifiers.P2P.WebSocket.Connection.Repository)
	private readonly repository!: ConnectionRepository;

	readonly #milestoneListener: Contracts.Kernel.EventListener = {
		handle: async (): Promise<void> => this.#closeUnsupportedConnections(),
	};

	// Lifecycle

	public initialize(): void {
		this.server.initialize();

		this.events.listen(Events.CryptoEvent.MilestoneChanged, this.#milestoneListener);
	}

	public async boot(): Promise<void> {
		await this.server.boot();
	}

	public async dispose(): Promise<void> {
		this.events.forget(Events.CryptoEvent.MilestoneChanged, this.#milestoneListener);

		await this.server.dispose();
	}

	// Routes

	// Register before boot(); requests for unknown paths are answered with 404.
	public registerRoute<TRequest, TResponse>(route: Route<TRequest, TResponse>): void {
		this.router.register(route as Route<unknown, unknown>);
	}

	// Connections

	// Fires for every connection, inbound or outbound, once its handshake has completed.
	public set onConnection(handler: ((connection: Connection) => void) | undefined) {
		this.listener.onConnection = handler;
		this.dialer.onConnection = handler;
	}

	// Outbound

	// Resolves once the connection is open and `onConnection` has been called; rejects on failure.
	public async dial(url: string): Promise<void> {
		await this.dialer.dial(url);
	}

	// Graceful close of the connection to an address, if there is one.
	public async disconnect(ip: string): Promise<void> {
		await this.repository.get(ip)?.close(CloseReason.LocalClose);
	}

	// Immediate close, for when waiting for the peer's closing handshake is not worth it.
	public terminate(ip: string, reason: CloseReason = CloseReason.LocalClose): void {
		this.repository.get(ip)?.terminate(reason);
	}

	// Bans

	public ban(ip: string, until: number): void {
		this.banList.ban(ip, until);
		this.repository.get(ip)?.terminate(CloseReason.Banned);
	}

	public isBanned(ip: string): boolean {
		return this.banList.isBanned(ip);
	}

	public bans(): { ip: string; until: number }[] {
		return this.banList.all();
	}

	// A peer whose software the new milestone no longer accepts loses its connection, as a handshake
	// would refuse it now. A connection still in its handshake has no version yet; the handshake checks it.
	#closeUnsupportedConnections(): void {
		for (const connection of this.repository.all()) {
			const version = connection.remoteVersion;

			if (version !== undefined && !isValidVersion(this.app, version)) {
				void connection.close(CloseReason.VersionMismatch);
			}
		}
	}
}
