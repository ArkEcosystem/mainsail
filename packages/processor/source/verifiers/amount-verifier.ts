import { inject, injectable } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import { BigNumber } from "@mainsail/utils";

@injectable()
export class AmountVerifier implements Contracts.Processor.Handler {
	@inject(Identifiers.Application.Instance)
	protected readonly app!: Contracts.Kernel.Application;

	public async execute(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		const block = unit.getBlock();

		let amount: BigNumber = BigNumber.ZERO;
		for (const transaction of block.transactions) {
			amount = amount.plus(transaction.data.value);
		}

		if (!amount.isEqualTo(block.data.amount)) {
			throw new Exceptions.InvalidAmount(unit.getBlock(), amount.toString());
		}
	}
}
