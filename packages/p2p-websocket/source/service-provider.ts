import type WebSocket from "ws";

import { Identifiers } from "@mainsail/constants";
import { injectable } from "@mainsail/container";
import { Providers } from "@mainsail/kernel";

import { Connection, type ConnectionFactory, type ConnectionOptions } from "./connection.js";
import { Dialer } from "./dialer.js";
import { Listener } from "./listener.js";

// Binds the transport. Register it before the package that owns the server lifecycle.
@injectable()
export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app
			.bind<ConnectionFactory>(Identifiers.P2P.WebSocket.Connection.Factory)
			.toFactory(
				() => (ws: WebSocket, options: ConnectionOptions) => this.app.resolve(Connection).init(ws, options),
			);
		this.app.bind(Identifiers.P2P.WebSocket.Listener).to(Listener).inSingletonScope();
		this.app.bind(Identifiers.P2P.WebSocket.Dialer).to(Dialer).inSingletonScope();
	}
}
