import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { Utils as AppUtils } from "@arkecosystem/core-kernel";
import { BigNumber } from "@arkecosystem/utils";
import cloneDeep from "lodash.clonedeep";

const defaultblockTimestampLookup = (height: number): number => {
	if (height === 1) {
		return 0;
	}

	throw new Error(`Attempted to lookup block with height ${height}, but no lookup implementation was provided`);
};

export const snoozeForBlock = async (
	sleep = 0,
	height = 1,
	blockTimestampLookupByHeight = defaultblockTimestampLookup,
	configuration: Contracts.Crypto.IConfiguration,
	slots,
): Promise<void> => {
	const blockTime: number = configuration.getMilestone(height).blocktime * 1000;
	const remainingTimeInSlot: number = slots.getTimeInMsUntilNextSlot(blockTimestampLookupByHeight);
	const sleepTime: number = sleep * 1000;

	return AppUtils.sleep(blockTime + remainingTimeInSlot + sleepTime);
};

export const injectMilestone = (
	index: number,
	milestone: Record<string, any>,
	configuration: Contracts.Crypto.IConfiguration,
): void =>
	(configuration as any).milestones.splice(index, 0, {
		...cloneDeep(configuration.getMilestone()),
		...milestone,
	});

export const getLastHeight = (app: Contracts.Kernel.Application): number =>
	app.get<Contracts.State.StateStore>(Identifiers.StateStore).getLastHeight();

export const getSenderNonce = (app: Contracts.Kernel.Application, senderPublicKey: string): Promise<BigNumber> =>
	app
		.getTagged<Contracts.State.WalletRepository>(Identifiers.WalletRepository, "state", "blockchain")
		.getNonce(senderPublicKey);

export const resetBlockchain = async (app: Contracts.Kernel.Application) => {
	// Resets everything so that it can be used in beforeAll to start clean a test suite
	// Now resets: blocks (remove blocks other than genesis), transaction pool
	// TODO: reset rounds, transactions in db...

	// reset to block height 1
	const blockchain = app.get<Contracts.Blockchain.Blockchain>(Identifiers.BlockchainService);
	const height: number = blockchain.getLastBlock().data.height;

	if (height) {
		// await blockchain.removeBlocks(height - 1);
	}

	// app.get<Contracts.TransactionPool.Connection>(Identifiers.TransactionPoolService).flush();
};

export const getWalletNonce = async (app: Contracts.Kernel.Application, publicKey: string): Promise<BigNumber> => {
	try {
		return app
			.getTagged<Contracts.State.WalletRepository>(Identifiers.WalletRepository, "state", "blockchain")
			.getNonce(publicKey);
	} catch {
		return BigNumber.ZERO;
	}
};
