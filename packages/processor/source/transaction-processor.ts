import { formatCurrency } from "@mainsail/blockchain-utils";
import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";

@injectable()
export class TransactionProcessor implements Contracts.Processor.TransactionProcessor {
	@inject(Identifiers.Evm.Instance)
	@tagged("instance", "evm")
	private readonly evm!: Contracts.Evm.Instance;

	@inject(Identifiers.Services.Log.Service)
	protected readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.Application.Instance)
	public readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.BlockchainUtils.FeeCalculator)
	private readonly feeCalculator!: Contracts.BlockchainUtils.FeeCalculator;

	@inject(Identifiers.Transaction.Handler.Registry)
	private readonly handlerRegistry!: Contracts.Transactions.TransactionHandlerRegistry;

	async process(
		unit: Contracts.Processor.ProcessableUnit,
		transaction: Contracts.Crypto.Transaction,
	): Promise<Contracts.Evm.TransactionReceipt> {
		const block = unit.getBlock();

		const milestone = this.configuration.getMilestone(block.header.number);
		const transactionHandler = await this.handlerRegistry.getActivatedHandlerForData(transaction.data);

		const commitKey: Contracts.Evm.CommitKey = {
			blockHash: block.header.hash,
			blockNumber: BigInt(block.header.number),
			round: BigInt(block.header.round),
		};

		const transactionHandlerContext: Contracts.Transactions.TransactionHandlerContext = {
			evm: {
				blockContext: {
					commitKey,
					gasLimit: BigInt(milestone.block.maxGasLimit),
					timestamp: BigInt(block.header.timestamp),
					validatorAddress: block.header.proposer,
				},
				instance: this.evm,
			},
		};

		if (!(await transactionHandler.verify(transaction))) {
			throw new Exceptions.InvalidSignatureError();
		}

		const receipt = await transactionHandler.apply(transactionHandlerContext, transaction);

		const feeConsumed = this.feeCalculator.calculateConsumed(transaction.data.gasPrice, Number(receipt.gasUsed));
		this.logger.debug(
			`executed EVM call (status=${receipt.status}, from=${transaction.data.from} to=${transaction.data.to} gasUsed=${receipt.gasUsed} paidNativeFee=${formatCurrency(this.configuration, feeConsumed)} deployed=${receipt.contractAddress})`,
		);

		return receipt;
	}
}
