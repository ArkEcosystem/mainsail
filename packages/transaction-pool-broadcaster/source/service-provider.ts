import { injectable } from "@mainsail/container";
import { Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";
import Joi from "joi";

import { Broadcaster } from "./broadcaster.js";
import { Peer } from "./peer.js";
import { PeerCommunicator } from "./peer-communicator.js";
import { PeerRepository } from "./peer-repository.js";

@injectable()
export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.TransactionPool.Peer.Repository).to(PeerRepository).inSingletonScope();
		this.app.bind(Identifiers.TransactionPool.Peer.Communicator).to(PeerCommunicator).inSingletonScope();
		this.app.bind(Identifiers.TransactionPool.Broadcaster).to(Broadcaster).inSingletonScope();

		this.app
			.bind<(ip: string) => Peer>(Identifiers.TransactionPool.Peer.Factory)
			.toFactory(
				() => (ip: string) => this.app.resolve(Peer).init(ip, this.config().getRequired<number>("txPoolPort")),
			);
	}

	public async required(): Promise<boolean> {
		return true;
	}

	public configSchema(): object {
		return Joi.object({
			maxPeersBroadcast: Joi.number().min(0).required(),
			maxSequentialErrors: Joi.number().min(0).required(),
			txPoolPort: Joi.number().min(0).required(),
		}).unknown(true);
	}
}
