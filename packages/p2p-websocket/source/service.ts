import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";

import type { BanList } from "./ban-list.js";
import type { ConnectionRepository } from "./connection-repository.js";
import type { Connection } from "./connection.js";
import type { Dialer } from "./dialer.js";
import type { Listener } from "./listener.js";
import type { Server, ServerOptions } from "./server.js";

import { CloseReason } from "./enums.js";

// The one object the p2p layer talks to. It only delegates: lifecycle to the server, inbound
// sockets to the listener, outbound ones to the dialer, bans to the ban list. Deciding whom to
// accept or ban stays with the caller through `accept` and `ban`.
@injectable()
export class Service {
	@inject(Identifiers.P2P.WebSocket.Server)
	private readonly server!: Server;

	@inject(Identifiers.P2P.WebSocket.Listener)
	private readonly listener!: Listener;

	@inject(Identifiers.P2P.WebSocket.Dialer)
	private readonly dialer!: Dialer;

	@inject(Identifiers.P2P.WebSocket.BanList)
	private readonly banList!: BanList;

	@inject(Identifiers.P2P.WebSocket.Connection.Repository)
	private readonly repository!: ConnectionRepository;

	// Lifecycle

	public initialize(name: string, options: ServerOptions): void {
		this.server.initialize(name, options);
	}

	public async boot(): Promise<void> {
		await this.server.boot();
	}

	public async dispose(): Promise<void> {
		await this.server.dispose();
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

	// Bans

	public ban(ip: string, until: number): void {
		this.banList.ban(ip, until);
		this.repository.get(ip)?.terminate(CloseReason.Banned);
	}
}
