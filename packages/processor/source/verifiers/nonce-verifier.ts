import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";
import { BigNumber } from "@mainsail/utils";

@injectable()
export class NonceVerifier implements Contracts.BlockProcessor.Handler {
	@inject(Identifiers.Application)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	public async execute(roundState: Contracts.Consensus.IRoundState): Promise<boolean> {
		const block = roundState.getProposal().toData().block;
		const nonceBySender = {};

		for (const transaction of block.transactions) {
			const data = transaction.data;

			if (data.version && data.version < 2) {
				break;
			}

			Utils.assert.defined<string>(data.senderPublicKey);

			const sender: string = data.senderPublicKey;

			if (nonceBySender[sender] === undefined) {
				const wallet = await roundState.getWalletRepository().findByPublicKey(sender);
				nonceBySender[sender] = wallet.getNonce();
			}

			Utils.assert.defined<string>(data.nonce);

			const nonce: BigNumber = BigNumber.make(data.nonce);

			if (!nonceBySender[sender].plus(1).isEqualTo(nonce)) {
				this.logger.warning(
					`Block { height: ${block.data.height.toLocaleString()}, id: ${block.data.id} } ` +
						`not accepted: invalid nonce order for sender ${sender}: ` +
						`preceding nonce: ${nonceBySender[sender].toFixed(0)}, ` +
						`transaction ${data.id} has nonce ${nonce.toFixed()}.`,
				);
				return false;
			}

			nonceBySender[sender] = nonce;
		}

		return true;
	}
}
