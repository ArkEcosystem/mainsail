import type { Contracts } from "@mainsail/contracts";

import { formatCurrency } from "@mainsail/blockchain-utils";
import { Identifiers } from "@mainsail/constants";
import { inject, injectable, tagged } from "@mainsail/container";

@injectable()
export class TransactionProcessor implements Contracts.Processor.TransactionProcessor {
	@inject(Identifiers.Evm.Instance)
	@tagged("instance", "evm")
	private readonly evm!: Contracts.Evm.Instance;

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.BlockchainUtils.FeeCalculator)
	private readonly feeCalculator!: Contracts.BlockchainUtils.FeeCalculator;

	public async process(
		block: Contracts.Crypto.Block,
		transaction: Contracts.Crypto.Transaction,
	): Promise<Contracts.Evm.TransactionReceipt> {
		const { receipt } = await this.evm.process({
			commitKey: {
				blockHash: block.hash,
				blockNumber: BigInt(block.number),
				round: BigInt(block.round),
			},
			data: Buffer.from(transaction.data.slice(2), "hex"),
			from: transaction.from,
			gasLimit: BigInt(transaction.gasLimit),
			gasPrice: BigInt(transaction.gasPrice),
			legacyAddress: transaction.senderLegacyAddress,
			nonce: transaction.nonce,
			specId: this.configuration.getMilestone(block.number).evmSpec,
			to: transaction.to,
			txHash: transaction.hash,
			value: transaction.value,
		});

		const feeConsumed = this.feeCalculator.calculateConsumed(transaction.gasPrice, receipt.gasUsed);
		this.logger.debug(
			`executed EVM call (status=${receipt.status}, from=${transaction.from} to=${transaction.to} gasUsed=${receipt.gasUsed} paidNativeFee=${formatCurrency(this.configuration, feeConsumed)} deployed=${receipt.contractAddress ?? ""})`,
			"consensus",
		);

		return receipt;
	}
}
