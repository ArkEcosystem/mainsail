import { inject } from "@arkecosystem/core-container";
import { Contracts, Exceptions,Identifiers } from "@arkecosystem/core-contracts";
import { Utils } from "@arkecosystem/core-kernel";
import Hapi from "@hapi/hapi";

import { constants } from "../../constants";
import { getPeerIp } from "../../utils/get-peer-ip";
import { getPeerConfig } from "../utils/get-peer-config";
import { Controller } from "./controller";

export class PeerController extends Controller {
	@inject(Identifiers.PeerRepository)
	private readonly peerRepository!: Contracts.P2P.PeerRepository;

	@inject(Identifiers.Database.Service)
	private readonly databaseService!: Contracts.Database.IDatabaseService;

	@inject(Identifiers.BlockchainService)
	private readonly blockchain!: Contracts.Blockchain.Blockchain;

	@inject(Identifiers.Cryptography.Time.Slots)
	private readonly slots!: any;

	public getPeers(request: Hapi.Request, h: Hapi.ResponseToolkit): Contracts.P2P.PeerBroadcast[] {
		const peerIp = getPeerIp(request.socket);

		return this.peerRepository
			.getPeers()
			.filter((peer) => peer.ip !== peerIp)
			.filter((peer) => peer.port !== -1)
			.sort((a, b) => {
				Utils.assert.defined<number>(a.latency);
				Utils.assert.defined<number>(b.latency);

				return a.latency - b.latency;
			})
			.slice(0, constants.MAX_PEERS_GETPEERS)
			.map((peer) => peer.toBroadcast());
	}

	public async getCommonBlocks(
		request: Hapi.Request,
		h: Hapi.ResponseToolkit,
	): Promise<{
		common: Contracts.Crypto.IBlockData;
		lastBlockHeight: number;
	}> {
		const commonBlocks: Contracts.Crypto.IBlockData[] = await Promise.all(
			(request.payload as any).ids.map(async (blockId) => await this.databaseService.getBlock(blockId)),
		);

		if (commonBlocks.length === 0) {
			throw new Exceptions.MissingCommonBlockError();
		}

		return {
			common: commonBlocks.sort((a, b) => a.height - b.height)[commonBlocks.length - 1],
			lastBlockHeight: this.blockchain.getLastBlock().data.height,
		};
	}

	public async getStatus(request: Hapi.Request, h: Hapi.ResponseToolkit): Promise<Contracts.P2P.PeerPingResponse> {
		const lastBlock: Contracts.Crypto.IBlock = this.blockchain.getLastBlock();

		const slotInfo = this.slots.getSlotInfo();

		return {
			config: getPeerConfig(this.app),
			state: {
				currentSlot: slotInfo.slotNumber,
				forgingAllowed: slotInfo.forgingStatus,
				header: lastBlock.header,
				height: lastBlock.data.height,
			},
		};
	}
}
