import type { Contracts } from "@mainsail/contracts";

import { Events, Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { ensureError } from "@mainsail/utils";

const batches: ReadonlyArray<{ kind: Contracts.Evm.ContractEvent["event"]; key: string; name: string }> = [
	{ key: "validators", kind: "ValidatorRegistered", name: Events.ValidatorEvent.Registered },
	{ key: "validators", kind: "ValidatorUpdated", name: Events.ValidatorEvent.Updated },
	{ key: "validators", kind: "ValidatorResigned", name: Events.ValidatorEvent.Resigned },
	{ key: "votes", kind: "Voted", name: Events.VoteEvent.Voted },
	{ key: "unvotes", kind: "Unvoted", name: Events.VoteEvent.Unvoted },
	{ key: "usernames", kind: "UsernameRegistered", name: Events.UsernameEvent.Registered },
	{ key: "usernames", kind: "UsernameResigned", name: Events.UsernameEvent.Resigned },
];

const addressesOf = (contractEvent: Contracts.Evm.ContractEvent): string[] =>
	"address" in contractEvent ? [contractEvent.address] : [contractEvent.voter, contractEvent.validator];
const toReceiptData = ({ output, ...receipt }: Contracts.Evm.TransactionReceipt) =>
	output === undefined ? receipt : { ...receipt, output: `0x${output.toString("hex")}` };

@injectable()
export class CommitEventEmitter implements Contracts.Processor.CommitEventEmitter {
	@inject(Identifiers.State.State)
	private readonly state!: Contracts.State.State;

	@inject(Identifiers.Services.EventDispatcher.Service)
	private readonly events!: Contracts.Kernel.EventDispatcher;

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	public emit(unit: Contracts.Processor.ProcessableUnit): void {
		if (this.state.isBootstrap()) {
			return;
		}

		const block = unit.getBlock();
		const { receipts } = unit.getProcessorResult();

		for (const transaction of block.transactions) {
			const { blockHash, blockNumber, hash, transactionIndex } = transaction;
			const receipt = receipts.get(hash);

			this.#emit(Events.TransactionEvent.Applied, {
				...transaction.toData(),
				blockHash,
				blockNumber,
				receipt: receipt && toReceiptData(receipt),
				transactionIndex,
			});
		}

		const contractEvents = unit.getContractEvents();

		for (const { key, kind, name } of batches) {
			const entries = contractEvents.filter(({ event }) => event === kind);

			if (entries.length > 0) {
				this.#emit(name, {
					addresses: [...new Set(entries.flatMap((entry) => addressesOf(entry)))],
					blockNumber: block.number,
					[key]: entries.map(({ event, ...entry }) => entry),
				});
			}
		}

		this.#emit(Events.BlockEvent.Applied, { ...block.toData(), contractEvents });
	}

	#emit(event: string, data: unknown): void {
		void this.events.dispatch(event, data).catch((rawError) => {
			const error = ensureError(rawError);
			this.logger.error(`Dispatching ${event} failed: ${error.stack ?? error.message}`, "consensus");
		});
	}
}
