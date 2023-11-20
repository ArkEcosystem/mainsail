import { inject, injectable } from "@mainsail/container";
import { Constants, Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";
import dayjs from "dayjs";

import { isValidVersion } from "./utils";

@injectable()
export class PeerVerifier implements Contracts.P2P.PeerVerifier {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.PeerCommunicator)
	private readonly communicator!: Contracts.P2P.PeerCommunicator;

	@inject(Identifiers.PeerDisposer)
	private readonly peerDisposer!: Contracts.P2P.PeerDisposer;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly cryptoConfiguration!: Contracts.Crypto.IConfiguration;

	@inject(Identifiers.StateService)
	private readonly stateService!: Contracts.State.Service;

	@inject(Identifiers.Database.Service)
	private readonly database!: Contracts.Database.IDatabaseService;

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
			peer.version = status.config.version;

			this.#verifyConfig(status.config);

			this.#verifyVersion(status.config);

			await this.#verifyHighestCommonBlock(peer, status.state);

			peer.lastPinged = dayjs();
			peer.plugins = status.config.plugins;

			return true;
		} catch (error) {
			this.logger.debugExtra(`Peer ${peer.ip} verification failed: ${error.message}`);

			this.peerDisposer.banPeer(peer.ip, error, false);

			return false;
		}
	}

	#verifyConfig(config: Contracts.P2P.PeerConfig): void {
		if (config.network.nethash !== this.cryptoConfiguration.get("network.nethash")) {
			throw new Error("Invalid nethash");
		}

		// TODO: Verify genesis block id
	}

	#verifyVersion(config: Contracts.P2P.PeerConfig): void {
		if (!isValidVersion(this.app, config.version)) {
			throw new Error("Invalid version");
		}
	}

	async #verifyHighestCommonBlock(peer: Contracts.P2P.Peer, state: Contracts.P2P.PeerState): Promise<void> {
		const block = this.stateService.getStateStore().getLastBlock();

		const heightToRequest = state.header.height < block.data.height ? state.header.height : block.data.height;

		const { blocks } = await this.communicator.getBlocks(peer, { fromHeight: heightToRequest, limit: 1 });

		if (blocks.length !== 1) {
			throw new Error("Failed to get blocks from peer");
		}

		// TODO: Support header only requests
		const receivedCommittedBlock = await this.blockFactory.fromCommittedBytes(blocks[0]);

		const blockToCompare =
			block.data.height === heightToRequest ? block : await this.database.getBlock(heightToRequest);

		Utils.assert.defined<Contracts.Crypto.IBlock>(blockToCompare);

		if (receivedCommittedBlock.block.data.height !== blockToCompare.data.height) {
			throw new Error("Received block does not match the requested height");
		}

		if (receivedCommittedBlock.block.data.id !== blockToCompare.data.id) {
			throw new Error("Received block does not match the requested id. Peer is on a different chain.");
		}
	}
}
