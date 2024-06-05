import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { http } from "@mainsail/utils";
import dayjs from "dayjs";

@injectable()
export class PeerCommunicator implements Contracts.TransactionPool.PeerCommunicator {
	@inject(Identifiers.TransactionPool.Peer.Repository)
	private readonly repository!: Contracts.TransactionPool.PeerRepository;

	public async postTransactions(
		peer: Contracts.TransactionPool.Peer,
		transactions: Contracts.Crypto.Transaction[],
	): Promise<void> {
		try {
			await http.post(`${peer.url}/api/transactions`, {
				body: { transactions: transactions.map((transaction) => transaction.serialized.toString("hex")) },
			});
		} catch (error) {
			this.handleSocketError(peer, error);
		}

		peer.errorCount = 0;
		peer.lastPinged = dayjs();
	}

	private handleSocketError(peer: Contracts.TransactionPool.Peer, error: Error): void {
		if (peer.errorCount > 3) {
			this.repository.forgetPeer(peer.ip);
			// TODO: Emit event
		}

		peer.errorCount++;
	}
}
