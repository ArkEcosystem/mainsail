import { Contracts, Identifiers } from "@mainsail/contracts";
import { BigNumber } from "@mainsail/utils";
import cloneDeep from "lodash.clonedeep";

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

export const getWalletNonce = async (app: Contracts.Kernel.Application, publicKey: string): Promise<BigNumber> =>
	(
		await app
			.getTagged<Contracts.State.WalletRepository>(Identifiers.WalletRepository, "state", "blockchain")
			.findByPublicKey(publicKey)
	).getNonce();
