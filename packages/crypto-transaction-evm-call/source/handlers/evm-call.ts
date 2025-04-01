import { inject, injectable } from "@mainsail/container";
import { Contracts, Events, Identifiers } from "@mainsail/contracts";
import { TransactionConstructor } from "@mainsail/crypto-transaction";
import { Handlers } from "@mainsail/transactions";
import { assert } from "@mainsail/utils";

import { EvmCallTransaction } from "../versions/index.js";

@injectable()
export class EvmCallTransactionHandler extends Handlers.TransactionHandler {
	@inject(Identifiers.Services.EventDispatcher.Service)
	private readonly events!: Contracts.Kernel.EventDispatcher;

	@inject(Identifiers.State.State)
	private readonly state!: Contracts.State.State;

	public dependencies(): ReadonlyArray<Handlers.TransactionHandlerConstructor> {
		return [];
	}

	public getConstructor(): TransactionConstructor {
		return EvmCallTransaction;
	}

	public async isActivated(): Promise<boolean> {
		return true;
	}

	public async apply(
		context: Contracts.Transactions.TransactionHandlerContext,
		transaction: Contracts.Crypto.Transaction,
	): Promise<Contracts.Evm.TransactionReceipt> {
		assert.string(transaction.hash);

		const { evmSpec } = this.configuration.getMilestone();

		const { from, senderLegacyAddress } = transaction.data;

		try {
			const { instance, blockContext } = context.evm;
			const { receipt } = await instance.process({
				blockContext,
				caller: from,
				data: Buffer.from(transaction.data.data, "hex"),
				gasLimit: BigInt(transaction.data.gas),
				gasPrice: BigInt(transaction.data.gasPrice),
				legacyAddress: senderLegacyAddress,
				nonce: transaction.data.nonce.toBigInt(),
				recipient: transaction.data.to,
				sequence: transaction.data.transactionIndex,
				specId: evmSpec,
				txHash: transaction.hash,
				value: transaction.data.value.toBigInt(),
			});

			void this.#emit(Events.EvmEvent.TransactionReceipt, {
				receipt,
				sender: from,
				transactionId: transaction.hash,
			});

			return receipt;
		} catch (error) {
			throw new Error(`invalid EVM call: ${error.message}`);
		}
	}

	async #emit<T>(event: Contracts.Kernel.EventName, data?: T): Promise<void> {
		if (this.state.isBootstrap()) {
			return;
		}

		return this.events.dispatch(event, data);
	}
}
