import { inject, injectable } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";
import { BigNumber } from "@mainsail/utils";

@injectable()
export class NonceVerifier implements Contracts.Processor.Handler {
	@inject(Identifiers.Application.Instance)
	protected readonly app!: Contracts.Kernel.Application;

	public async execute(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		const block = unit.getBlock();

		const nonceBySender = {};

		for (const transaction of block.transactions) {
			const data = transaction.data;

			Utils.assert.defined<string>(data.senderPublicKey);

			const sender: string = data.senderPublicKey;

			if (nonceBySender[sender] === undefined) {
				const wallet = await unit.store.walletRepository.findByPublicKey(sender);
				nonceBySender[sender] = wallet.getNonce();
			}

			Utils.assert.defined<string>(data.nonce);

			const nonce: BigNumber = BigNumber.make(data.nonce);

			if (!nonceBySender[sender].plus(1).isEqualTo(nonce)) {
				throw new Exceptions.InvalidNonce(block, sender);
			}

			nonceBySender[sender] = nonce;
		}
	}
}
