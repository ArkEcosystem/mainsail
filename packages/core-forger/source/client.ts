import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Exceptions, Identifiers } from "@arkecosystem/core-contracts";
import { Utils } from "@arkecosystem/core-kernel";
import { Codecs, Nes, NetworkState, NetworkStateStatus } from "@arkecosystem/core-p2p";

import { RelayHost } from "./interfaces";

const MAX_PAYLOAD_CLIENT = 20 * 1024 * 1024; // allow large value of max payload communicating with relay

@injectable()
export class Client {
	@inject(Identifiers.LogService)
	private readonly logger: Contracts.Kernel.Logger;

	@inject(Identifiers.Cryptography.Block.Serializer)
	private readonly serializer: Contracts.Crypto.IBlockSerializer;

	public hosts: RelayHost[] = [];

	// @ts-ignore
	private host: RelayHost;

	public register(hosts: RelayHost[]) {
		this.hosts = hosts.map((host: RelayHost) => {
			const url = `ws://${Utils.IpAddress.normalizeAddress(host.hostname)}:${host.port}`;
			const options = { ws: { maxPayload: MAX_PAYLOAD_CLIENT } };
			const connection = new Nes.Client(url, options);
			connection.connect().catch((error) => {}); // connect promise can fail when p2p is not ready, it's fine it will retry

			connection.onError = (e) => {
				this.logger.error(e.message);
			};

			host.socket = connection;

			return host;
		});

		this.host = this.hosts[0];
	}

	public dispose(): void {
		for (const host of this.hosts) {
			const socket: Nes.Client | undefined = host.socket;

			if (socket) {
				socket.disconnect();
			}
		}
	}

	public async broadcastBlock(block: Contracts.Crypto.IBlock): Promise<void> {
		this.logger.debug(
			`Broadcasting block ${block.data.height.toLocaleString()} (${block.data.id}) with ${
				block.data.numberOfTransactions
			} transactions to ${this.host.hostname}`,
		);

		try {
			await this.emit("p2p.blocks.postBlock", {
				block: await this.serializer.serializeWithTransactions({
					...block.data,
					transactions: block.transactions.map((tx) => tx.data),
				}),
			});
		} catch (error) {
			this.logger.error(`Broadcast block failed: ${error.message}`);
		}
	}

	public async syncWithNetwork(): Promise<void> {
		await this.selectHost();

		this.logger.debug(`Sending wake-up check to relay node ${this.host.hostname}`);

		try {
			await this.emit("p2p.internal.syncBlockchain");
		} catch (error) {
			this.logger.error(`Could not sync check: ${error.message}`);
		}
	}

	public async getRound(): Promise<Contracts.P2P.CurrentRound> {
		await this.selectHost();

		return this.emit<Contracts.P2P.CurrentRound>("p2p.internal.getCurrentRound");
	}

	public async getNetworkState(): Promise<Contracts.P2P.NetworkState> {
		try {
			return NetworkState.parse(
				await this.emit<Contracts.P2P.NetworkState>("p2p.internal.getNetworkState", {}, 4000),
			);
		} catch {
			return new NetworkState(NetworkStateStatus.Unknown);
		}
	}

	public async getTransactions(): Promise<Contracts.P2P.ForgingTransactions> {
		return this.emit<Contracts.P2P.ForgingTransactions>("p2p.internal.getUnconfirmedTransactions");
	}

	public async emitEvent(
		event: string,
		body:
			| { error: string }
			| { activeValidators: string[] }
			| Contracts.Crypto.IBlockData
			| Contracts.Crypto.ITransactionData,
	): Promise<void> {
		// NOTE: Events need to be emitted to the localhost. If you need to trigger
		// actions on a remote host based on events you should be using webhooks
		// that get triggered by the events you wish to react to.

		const allowedHosts: string[] = ["127.0.0.1", "::1"];

		const host: RelayHost | undefined = this.hosts.find((item) =>
			allowedHosts.some((allowedHost) => item.hostname.includes(allowedHost)),
		);

		if (!host) {
			this.logger.error("emitEvent: unable to find any local hosts.");
			return;
		}

		try {
			await this.emit("p2p.internal.emitEvent", { body, event });
		} catch {
			this.logger.error(`Failed to emit "${event}" to "${host.hostname}:${host.port}"`);
		}
	}

	public async selectHost(): Promise<void> {
		for (let index = 0; index < 10; index++) {
			for (const host of this.hosts) {
				if (host.socket && host.socket._isReady()) {
					this.host = host;
					return;
				}
			}

			await Utils.sleep(100);
		}

		this.logger.debug(
			`No open socket connection to any host: ${JSON.stringify(
				this.hosts.map((host) => `${host.hostname}:${host.port}`),
			)}.`,
		);

		throw new Exceptions.HostNoResponseError(this.hosts.map((host) => host.hostname).join(","));
	}

	private async emit<T = object>(event: string, payload: Record<string, any> = {}, timeout = 4000): Promise<T> {
		try {
			Utils.assert.defined<Nes.Client>(this.host.socket);

			const codec = this.getCodec(event);

			const options = {
				path: event,
				payload: codec.request.serialize(payload),
			};

			const response: any = await this.host.socket.request(options);

			return codec.response.deserialize(response.payload);
		} catch (error) {
			throw new Exceptions.RelayCommunicationError(
				`${this.host.hostname}:${this.host.port}<${event}>`,
				error.message,
			);
		}
	}

	private getCodec(event: string) {
		const codecs = {
			"p2p.blocks.postBlock": Codecs.postBlock,
			"p2p.internal.emitEvent": Codecs.emitEvent,
			"p2p.internal.getCurrentRound": Codecs.getCurrentRound,
			"p2p.internal.getNetworkState": Codecs.getNetworkState,
			"p2p.internal.getUnconfirmedTransactions": Codecs.getUnconfirmedTransactions,
			"p2p.internal.syncBlockchain": Codecs.syncBlockchain,
		};

		return codecs[event];
	}
}
