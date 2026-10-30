import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";

import type { BanList } from "./ban-list.js";
import type { ConnectionRepository } from "./connection-repository.js";
import type { Dialer } from "./dialer.js";
import type { Connection, Route } from "./interfaces/index.js";
import type { Listener } from "./listener.js";
import type { Router } from "./router.js";
import type { Server } from "./server.js";

import { CloseReason } from "./enums.js";

// The one object the p2p layer talks to. It only delegates: lifecycle to the server, routes to the
// router, inbound sockets to the listener, outbound ones to the dialer, bans to the ban list.
// Deciding whom to accept or ban stays with the caller through `accept` and `ban`.
@injectable()
export class Service {
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

	// Lifecycle

	public initialize(): void {
		this.server.initialize();
	}

	public async boot(): Promise<void> {
		await this.server.boot();
	}

	public async dispose(): Promise<void> {
		await this.server.dispose();
	}

	// Routes

	// Register before boot(); requests for unknown paths are answered with 404.
	public registerRoute<TRequest, TResponse>(route: Route<TRequest, TResponse>): void {
		this.router.register(route as Route<unknown, unknown>);
	}

	// Inbound

	// Runs after the built-in verifiers (ban list, duplicate address) and before the handshake.
	public set accept(hook: ((remoteAddress: string) => CloseReason | undefined) | undefined) {
		this.listener.accept = hook;
	}

	// Fires for inbound connections once their handshake has completed.
	public set onConnection(handler: ((connection: Connection) => void) | undefined) {
		this.listener.onConnection = handler;
	}

	// Outbound

	public async dial(url: string): Promise<Connection> {
		return this.dialer.dial(url);
	}

	// Graceful close of the connection to an address, if there is one.
	public async disconnect(ip: string): Promise<void> {
		await this.repository.get(ip)?.close(CloseReason.LocalClose);
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
}
