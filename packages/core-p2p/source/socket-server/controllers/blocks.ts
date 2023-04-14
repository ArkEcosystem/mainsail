import { inject, tagged } from "@arkecosystem/core-container";
import { Contracts, Exceptions, Identifiers } from "@arkecosystem/core-contracts";
import { Providers, Utils } from "@arkecosystem/core-kernel";
import Hapi from "@hapi/hapi";

import { constants } from "../../constants";
import { mapAddr } from "../utils/map-addr";
import { Controller } from "./controller";

export class BlocksController extends Controller {
	@inject(Identifiers.PluginConfiguration)
	@tagged("plugin", "core-p2p")
	private readonly pluginConfiguration!: Providers.PluginConfiguration;

	@inject(Identifiers.BlockchainService)
	private readonly blockchain!: Contracts.Blockchain.Blockchain;

	@inject(Identifiers.Database.Service)
	private readonly database: Contracts.Database.IDatabaseService;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.IConfiguration;

	@inject(Identifiers.Cryptography.Block.Deserializer)
	private readonly deserializer!: Contracts.Crypto.IBlockDeserializer;

	@inject(Identifiers.Cryptography.Time.Slots)
	private readonly slots: Contracts.Crypto.Slots;

	// @TODO: extract this into
	public async postBlock(
		request: Hapi.Request,
		h: Hapi.ResponseToolkit,
	): Promise<{ status: boolean; height: number }> {
		const blockBuffer: Buffer = request.payload.block;

		const deserializedHeader = await this.deserializer.deserialize(blockBuffer, true);

		if (deserializedHeader.data.numberOfTransactions > this.configuration.getMilestone().block.maxTransactions) {
			throw new Exceptions.TooManyTransactionsError(deserializedHeader.data);
		}

		const deserialized: {
			data: Contracts.Crypto.IBlockData;
			transactions: Contracts.Crypto.ITransaction[];
		} = await this.deserializer.deserialize(blockBuffer);

		const block: Contracts.Crypto.IBlockData = {
			...deserialized.data,
			transactions: deserialized.transactions.map((tx) => tx.data),
		};

		const fromForger: boolean = Utils.isWhitelisted(
			this.pluginConfiguration.getOptional<string[]>("remoteAccess", []),
			request.info.remoteAddress,
		);

		if (!fromForger) {
			if (this.blockchain.pingBlock(block)) {
				return { height: this.blockchain.getLastHeight(), status: true };
			}

			const lastDownloadedBlock: Contracts.Crypto.IBlockData = this.blockchain.getLastDownloadedBlock();

			if (!Utils.isBlockChained(lastDownloadedBlock, block, this.slots)) {
				return { height: this.blockchain.getLastHeight(), status: false };
			}
		}

		this.logger.info(
			`Received new block at height ${block.height.toLocaleString()} with ${Utils.pluralize(
				"transaction",
				block.numberOfTransactions,
				true,
			)} from ${mapAddr(request.info.remoteAddress)}`,
		);

		await this.blockchain.handleIncomingBlock(block, fromForger);

		return { height: this.blockchain.getLastHeight(), status: true };
	}

	public async getBlocks(
		request: Hapi.Request,
		h: Hapi.ResponseToolkit,
	): Promise<Contracts.Crypto.IBlockData[] | Contracts.Shared.DownloadBlock[]> {
		const requestBlockHeight: number = +(request.payload as any).lastBlockHeight + 1;
		const requestBlockLimit: number = +(request.payload as any).blockLimit || 400;
		const requestHeadersOnly = !!(request.payload as any).headersOnly;

		const lastHeight: number = this.blockchain.getLastHeight();
		if (requestBlockHeight > lastHeight) {
			return [];
		}

		const blocks: Contracts.Shared.DownloadBlock[] = await this.database.getBlocksForDownload(
			requestBlockHeight,
			requestBlockLimit,
			requestHeadersOnly,
		);

		// Only return the blocks fetched while we are below the p2p maxPayload limit
		const blocksToReturn: Contracts.Shared.DownloadBlock[] = [];
		const maxPayloadWithMargin = constants.DEFAULT_MAX_PAYLOAD - 100 * 1024; // 100KB margin because we're dealing with estimates
		for (let index = 0, sizeEstimate = 0; sizeEstimate < maxPayloadWithMargin && index < blocks.length; index++) {
			blocksToReturn.push(blocks[index]);
			sizeEstimate +=
				blocks[index].transactions?.reduce((accumulator, current) => accumulator + current.length, 0) ?? 0;
			// We estimate the size of each block -- as it will be sent through p2p -- with the length of the
			// associated transactions. When blocks are big, size of the block header is negligible compared to its
			// transactions. And here we just want a broad limit to stop when getting close to p2p max payload.
		}

		this.logger.info(
			`${mapAddr(request.info.remoteAddress)} has downloaded ${Utils.pluralize(
				"block",
				blocksToReturn.length,
				true,
			)} from height ${requestBlockHeight.toLocaleString()}`,
		);

		return blocksToReturn;
	}
}
