import { inject, injectable } from "@mainsail/container";
import { Constants, Contracts, Identifiers } from "@mainsail/contracts";
import dayjs from "dayjs";

import { isValidVersion } from "./utils";

@injectable()
export class PeerVerifier implements Contracts.P2P.PeerVerifier {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.PeerCommunicator)
	private readonly communicator!: Contracts.P2P.PeerCommunicator;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly cryptoConfiguration!: Contracts.Crypto.IConfiguration;

	// TODO: Handle timeouts
	// const verifyTimeout = this.configuration.getRequired<number>("verifyTimeout");

	public async verify(peer: Contracts.P2P.Peer): Promise<boolean> {
		// TODO: Use defaults
		if (process.env[Constants.Flags.CORE_SKIP_PEER_STATE_VERIFICATION] !== "true") {
			return true;
		}

		// TODO: support timeout and block handling
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

		peer.lastPinged = dayjs();
		peer.plugins = status.config.plugins;

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
