import { inject, tagged } from "@arkecosystem/core-container";
import { Contracts, Identifiers, Exceptions } from "@arkecosystem/core-contracts";

import { Providers, Utils } from "@arkecosystem/core-kernel";
import { FastifyRequest } from "fastify";

import { mapAddr } from "../utils/map-addr";

export class PostBlockController {
	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.PluginConfiguration)
	@tagged("plugin", "core-p2p")
	private readonly pluginConfiguration!: Providers.PluginConfiguration;

	@inject(Identifiers.BlockchainService)
	private readonly blockchain!: Contracts.Blockchain.Blockchain;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.IConfiguration;

	@inject(Identifiers.Cryptography.Block.Deserializer)
	private readonly deserializer!: Contracts.Crypto.IBlockDeserializer;

	@inject(Identifiers.Cryptography.Time.Slots)
	private readonly slots: Contracts.Crypto.Slots;

	public async invoke(request: FastifyRequest): Promise<{ status: boolean; height: number }> {
		const blockBuffer: Buffer = (request.body as any).block;

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
			request.ip,
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
			)} from ${mapAddr(request.ip)}`,
		);

		await this.blockchain.handleIncomingBlock(block, fromForger);

		return { height: this.blockchain.getLastHeight(), status: true };
	}
}
