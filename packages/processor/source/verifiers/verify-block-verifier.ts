import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class VerifyBlockVerifier implements Contracts.BlockProcessor.Handler {
	@inject(Identifiers.Application)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Cryptography.Block.Verifier)
	private readonly blockVerifier!: Contracts.Crypto.IBlockVerifier;

	@inject(Identifiers.TransactionHandlerRegistry)
	private readonly handlerRegistry!: Contracts.Transactions.ITransactionHandlerRegistry;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	public async execute(unit: Contracts.BlockProcessor.IProcessableUnit): Promise<boolean> {
		const block = unit.getBlock();

		let verification: Contracts.Crypto.IBlockVerification = await this.blockVerifier.verify(block);

		if (verification.containsMultiSignatures) {
			try {
				for (const transaction of block.transactions) {
					const handler = await this.handlerRegistry.getActivatedHandlerForData(transaction.data);
					await handler.verify(unit.getWalletRepository(), transaction);
				}

				// @TODO: check if we can remove this duplicate verification
				verification = await this.blockVerifier.verify(block);
			} catch (error) {
				this.logger.warning(`Failed to verify block, because: ${error.message}`);
			}
		}

		if (!verification.verified) {
			this.logger.warning(
				`Block ${block.data.height.toLocaleString()} (${
					block.data.id
				}) disregarded because verification failed`,
			);

			this.logger.warning(JSON.stringify(verification, undefined, 4));

			return false;
		}

		return true;
	}
}
