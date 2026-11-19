import type { Contracts } from "@mainsail/contracts";

import { Events, Identifiers } from "@mainsail/constants";
import { inject, injectable, tagged } from "@mainsail/container";
import { Ipc } from "@mainsail/kernel";
import { ensureError, http, HttpError } from "@mainsail/utils";
import dayjs from "dayjs";

const MAX_RESPONSE_BYTES = 128 * 1024;

@injectable()
export class PeerCommunicator implements Contracts.TransactionPool.PeerCommunicator {
	@inject(Identifiers.TransactionPool.Peer.Repository)
	private readonly repository!: Contracts.TransactionPool.PeerRepository;

	@inject(Identifiers.ServiceProvider.Configuration)
	@tagged("plugin", "transaction-pool-broadcaster")
	protected readonly configuration!: Contracts.Kernel.PluginConfiguration;

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	public async postTransactions(
		peer: Contracts.TransactionPool.Peer,
		transactions: Contracts.Crypto.Transaction[],
	): Promise<void> {
		try {
			await http.post(`${peer.url}/api/transactions`, {
				body: { transactions: transactions.map((transaction) => transaction.serialized.toString("hex")) },
				maxContentLength: MAX_RESPONSE_BYTES,
				signal: AbortSignal.timeout(this.configuration.getRequired<number>("postTimeout")),
			});

			peer.errorCount = 0;
			peer.lastPinged = dayjs();
		} catch (rawError) {
			const error = ensureError(rawError);

			if (error instanceof HttpError && error.response.statusCode === 429) {
				this.logger.debug(`rate limited by ${peer.ip}`);

				return;
			}

			this.handleSocketError(peer, error);
		}
	}

	private handleSocketError(peer: Contracts.TransactionPool.Peer, error: Error): void {
		this.logger.debug(`socket error ${peer.ip}: ${error.message}`);

		if (++peer.errorCount >= this.configuration.getRequired<number>("maxSequentialErrors")) {
			this.repository.forgetPeer(peer.ip);
			Ipc.emit(Events.PeerEvent.Removed, peer.ip);
		}
	}
}
