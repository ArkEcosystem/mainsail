import { Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";
import Joi from "joi";

import { Broadcaster } from "./broadcaster.js";
import { Peer } from "./peer.js";
import { PeerCommunicator } from "./peer-communicator.js";
import { PeerProcessor } from "./peer-processor.js";
import { PeerRepository } from "./peer-repository.js";
import { PeerVerifier } from "./peer-verifier.js";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.TransactionPool.Peer.Repository).to(PeerRepository).inSingletonScope();
		this.app.bind(Identifiers.TransactionPool.Peer.Processor).to(PeerProcessor).inSingletonScope();
		this.app.bind(Identifiers.TransactionPool.Peer.Verifier).to(PeerVerifier).inSingletonScope();
		this.app.bind(Identifiers.TransactionPool.Peer.Communicator).to(PeerCommunicator).inSingletonScope();
		this.app.bind(Identifiers.TransactionPool.Broadcaster).to(Broadcaster).inSingletonScope();

		this.app.bind(Identifiers.TransactionPool.Peer.Factory).toFactory<Peer, [string]>(
			() => (ip: string) =>
				// const sanitizedIp = sanitizeRemoteAddress(ip);
				// Utils.assert.defined<string>(sanitizedIp);

				this.app.resolve(Peer).init(ip, 4007), // TODO: Define port
		);
	}

	public async required(): Promise<boolean> {
		return true;
	}

	public configSchema(): object {
		return Joi.object({
			blacklist: Joi.array().items(Joi.string()).required(),
			maxPeersBroadcast: Joi.number().min(0).required(),
			maxSequentialErrors: Joi.number().min(0).required(),
			whitelist: Joi.array().items(Joi.string()).required(),
		}).unknown(true);
	}
}
