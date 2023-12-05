import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

import { getPeerUrl } from "./utils";

@injectable()
export class PeerApiNode implements Contracts.P2P.PeerApiNode {
	public ip!: string;
	public port!: number;
	public protocol!: Contracts.P2P.PeerProtocol;

	statusCode?: number;
	latency?: number;

	constructor() { }

	public init(ip: string, port: number, protocol?: Contracts.P2P.PeerProtocol): PeerApiNode {
		this.ip = ip;
		this.port = port;
		this.protocol = protocol ?? (port === 443 ? Contracts.P2P.PeerProtocol.Https : Contracts.P2P.PeerProtocol.Http);

		return this;
	}

	url(): string {
		return getPeerUrl(this);
	}
}

@injectable()
export class PeerApiNodeRepository implements Contracts.P2P.PeerApiNodeRepository {
	readonly #apiNodes: Map<string, Contracts.P2P.PeerApiNode> = new Map<string, Contracts.P2P.PeerApiNode>();
	readonly #apiNodesPending: Map<string, Contracts.P2P.PeerApiNode> = new Map<string, Contracts.P2P.PeerApiNode>();

	public getApiNodes(): Contracts.P2P.PeerApiNodes {
		return [...this.#apiNodes.values()];
	}

	public hasApiNode(apiNode: Contracts.P2P.PeerApiNode): boolean {
		return this.#apiNodes.has(apiNode.ip);
	}

	public setApiNode(apiNode: Contracts.P2P.PeerApiNode): void {
		this.#apiNodes.set(apiNode.ip, apiNode);
	}

	public forgetApiNode(apiNode: Contracts.P2P.PeerApiNode): void {
		this.#apiNodes.delete(apiNode.ip);
	}

	public setPendingApiNode(apiNode: Contracts.P2P.PeerApiNode): void {
		this.#apiNodesPending.set(apiNode.ip, apiNode);
	}

	public forgetPendingApiNode(apiNode: Contracts.P2P.PeerApiNode): void {
		this.#apiNodesPending.delete(apiNode.ip);
	}

	public hasPendingApiNode(apiNode: Contracts.P2P.PeerApiNode): boolean {
		return this.#apiNodesPending.has(apiNode.ip);
	}
}
