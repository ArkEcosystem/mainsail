import { injectable } from "@arkecosystem/core-container";
import { Contracts } from "@arkecosystem/core-contracts";
import { Utils } from "@arkecosystem/core-kernel";
import delay from "delay";
import got from "got";

const TEN_SECONDS_IN_MILLISECONDS = 10_000;

@injectable()
export class PeerConnector implements Contracts.P2P.PeerConnector {
	private readonly connections: Set<string> = new Set<string>();
	private readonly errors: Map<string, string> = new Map<string, string>();
	private readonly lastConnectionCreate: Map<string, number> = new Map<string, number>();

	public all(): string[] {
		return [...this.connections];
	}

	public async connect(peer: Contracts.P2P.Peer, maxPayload?: number): Promise<void> {
		if (!this.connections.has(peer.ip)) {
			// delay a bit if last connection create was less than 10 sec ago to prevent possible abuse of reconnection
			const timeSinceLastConnectionCreate = Date.now() - (this.lastConnectionCreate.get(peer.ip) ?? 0);

			if (timeSinceLastConnectionCreate < TEN_SECONDS_IN_MILLISECONDS) {
				await delay(TEN_SECONDS_IN_MILLISECONDS - timeSinceLastConnectionCreate);
			}
		}

		await got.get(`http://${Utils.IpAddress.normalizeAddress(peer.ip)}:${peer.port}/status`);

		this.connections.add(peer.ip);
		this.lastConnectionCreate.set(peer.ip, Date.now());
	}

	public disconnect(peer: Contracts.P2P.Peer): void {
		if (this.connections.has(peer.ip)) {
			this.connections.delete(peer.ip);
		}

		const timeSinceLastConnectionCreate = Date.now() - (this.lastConnectionCreate.get(peer.ip) ?? 0);
		setTimeout(
			() => {
				if (!this.connections.has(peer.ip)) {
					this.lastConnectionCreate.delete(peer.ip);
				}
			},
			Math.max(TEN_SECONDS_IN_MILLISECONDS - timeSinceLastConnectionCreate, 0), // always between 0-10 seconds
		);
	}

	public getError(peer: Contracts.P2P.Peer): string | undefined {
		return this.errors.get(peer.ip);
	}

	public setError(peer: Contracts.P2P.Peer, error: string): void {
		this.errors.set(peer.ip, error);
	}

	public hasError(peer: Contracts.P2P.Peer, error: string): boolean {
		return this.getError(peer) === error;
	}

	public forgetError(peer: Contracts.P2P.Peer): void {
		this.errors.delete(peer.ip);
	}
}
