import type { Contracts } from "@mainsail/contracts";

import { formatCurrency } from "@mainsail/blockchain-utils";
import { Identifiers, Events } from "@mainsail/constants";
import { inject, injectable, tagged } from "@mainsail/container";
import { InvalidSignatureError } from "@mainsail/exceptions";
import { ensureError } from "@mainsail/utils";

@injectable()
export class TransactionProcessor implements Contracts.Processor.TransactionProcessor {
	@inject(Identifiers.Evm.Instance)
	@tagged("instance", "evm")
	private readonly evm!: Contracts.Evm.Instance;

	@inject(Identifiers.Services.Log.Service)
	protected readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.BlockchainUtils.FeeCalculator)
	private readonly feeCalculator!: Contracts.BlockchainUtils.FeeCalculator;

	@inject(Identifiers.State.State)
	private readonly state!: Contracts.State.State;

	@inject(Identifiers.Services.EventDispatcher.Service)
	private readonly eventDispatcher!: Contracts.Kernel.EventDispatcher;

	@inject(Identifiers.Cryptography.Transaction.Verifier)
	protected readonly verifier!: Contracts.Crypto.TransactionVerifier;

	async process(
		unit: Contracts.Processor.ProcessableUnit,
		transaction: Contracts.Crypto.Transaction,
	): Promise<Contracts.Evm.TransactionReceipt> {
		const block = unit.getBlock();

		// TODO: Move to verifiers
		if (!(await this.verifier.verifyHash(transaction))) {
			throw new InvalidSignatureError();
		}

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
			specId: this.configuration.getMilestone().evmSpec,
			to: transaction.to,
			txHash: transaction.hash,
			value: transaction.value,
		});

		this.#emit(transaction, receipt);

		const feeConsumed = this.feeCalculator.calculateConsumed(transaction.gasPrice, receipt.gasUsed);
		this.logger.debug(
			`executed EVM call (status=${receipt.status}, from=${transaction.from} to=${transaction.to} gasUsed=${receipt.gasUsed} paidNativeFee=${formatCurrency(this.configuration, feeConsumed)} deployed=${receipt.contractAddress ?? ""})`,
			"consensus",
		);

		return receipt;
	}

	#emit(transaction: Contracts.Crypto.Transaction, receipt: Contracts.Evm.TransactionReceipt): void {
		if (this.state.isBootstrap()) {
			return;
		}

		void this.eventDispatcher
			.dispatch(Events.EvmEvent.TransactionReceipt, {
				receipt,
				sender: transaction.from,
				transactionId: transaction.hash,
			})
			.catch((rawError) => {
				const error = ensureError(rawError);
				this.logger.error(error.stack ?? error.message);
			});
	}
}
