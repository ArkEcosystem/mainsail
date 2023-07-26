import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { isValidVersion } from "./utils";

@injectable()
export class PeerVerifier {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.PeerCommunicator)
	private readonly communicator!: Contracts.P2P.PeerCommunicator;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly cryptoConfiguration!: Contracts.Crypto.IConfiguration;

	public async verify(peer: Contracts.P2P.Peer): Promise<boolean> {
		// TODO: Verify peer IP
		const status = await this.communicator.getStatus(peer);

		if (!status) {
			return false;
		}

		if (!this.#verifyConfig(status.config)) {
			return false;
		}

		if (!this.#verifyVersion(peer)) {
			return false;
		}

		if (!(await this.#verifyHighestCommonBlock(peer, status.state))) {
			return false;
		}

		return true;
	}

	#verifyConfig(config: Contracts.P2P.PeerConfig): boolean {
		return config.network.nethash === this.cryptoConfiguration.get("network.nethash");
	}

	#verifyVersion(peer: Contracts.P2P.Peer): boolean {
		return !isValidVersion(this.app, peer);
	}

	async #verifyHighestCommonBlock(peer: Contracts.P2P.Peer, state: Contracts.P2P.PeerState): Promise<boolean> {
		// TODO: Verify highest common block

		return true;
	}
}
