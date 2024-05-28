import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import { http } from "@mainsail/utils";

@injectable()
export class PeerCommunicator implements Contracts.TransactionPool.PeerCommunicator {
	public async postTransactions(
		peer: Contracts.TransactionPool.Peer,
		transactions: Contracts.Crypto.Transaction[],
	): Promise<void> {
		try {
			await http.post(`${peer.url}/api/transactions`, {
				body: { transactions: transactions.map((transaction) => transaction.serialized.toString("hex")) },
			});

			// TODO: Validate response
		} catch (error) {
			this.handleSocketError(peer, error);
		}
	}

	private handleSocketError(peer: Contracts.TransactionPool.Peer, error: Error): void {
		// TODO: Add peer disposer
	}
}
