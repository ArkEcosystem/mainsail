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

	@inject(Identifiers.StateStore)
	private readonly stateStore!: Contracts.State.StateStore;

	@inject(Identifiers.Cryptography.Block.Factory)
	private readonly blockFactory!: Contracts.Crypto.IBlockFactory;

	@inject(Identifiers.P2PLogger)
	private readonly logger!: Contracts.P2P.Logger;

	public async verify(peer: Contracts.P2P.Peer): Promise<boolean> {
		if (process.env[Constants.Flags.CORE_SKIP_PEER_STATE_VERIFICATION] === "true") {
			return true;
		}

		try {
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
		} catch (error) {
			this.logger.debugExtra(`Peer ${peer.ip} verification failed: ${error.message}`);

			return false;
		}
	}

	#verifyConfig(config: Contracts.P2P.PeerConfig): boolean {
		return config.network.nethash === this.cryptoConfiguration.get("network.nethash");
	}

	#verifyVersion(peer: Contracts.P2P.Peer): boolean {
		return !isValidVersion(this.app, peer);
	}

	async #verifyHighestCommonBlock(peer: Contracts.P2P.Peer, state: Contracts.P2P.PeerState): Promise<boolean> {
		const block = this.stateStore.getLastBlock();

		const heightToRequest = state.header.height < block.data.height ? state.header.height : block.data.height;

		const { blocks } = await this.communicator.getBlocks(peer, { fromHeight: heightToRequest, limit: 1 });

		if (blocks.length !== 1) {
			throw new Error("Failed to get blocks from peer");
		}

		// TODO: Support header only requests
		const receivedCommittedBlock = await this.blockFactory.fromCommittedBytes(blocks[0]);

		if (receivedCommittedBlock.block.data.height !== block.data.height) {
			console.log(heightToRequest, block);

			throw new Error("Received block does not match the requested height");
		}

		if (receivedCommittedBlock.block.data.id !== block.data.id) {
			throw new Error("Received block does not match the requested id. Peer is on a different chain.");
		}

		return true;
	}
}
