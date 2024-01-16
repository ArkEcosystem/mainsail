import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

import { getPeerUrl } from "./utils";

@injectable()
export class ApiNode implements Contracts.P2P.ApiNode {
	public ip!: string;
	public port!: number;
	public protocol!: Contracts.P2P.PeerProtocol;

	statusCode?: number;
	latency?: number;

	constructor() {}

	public init(ip: string, port: number, protocol?: Contracts.P2P.PeerProtocol): ApiNode {
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
export class ApiNodeRepository implements Contracts.P2P.ApiNodeRepository {
	readonly #apiNodes: Map<string, Contracts.P2P.ApiNode> = new Map<string, Contracts.P2P.ApiNode>();
	readonly #apiNodesPending: Map<string, Contracts.P2P.ApiNode> = new Map<string, Contracts.P2P.ApiNode>();

	public getApiNodes(): Contracts.P2P.ApiNodes {
		return [...this.#apiNodes.values()];
	}

	public hasApiNode(apiNode: Contracts.P2P.ApiNode): boolean {
		return this.#apiNodes.has(apiNode.ip);
	}

	public setApiNode(apiNode: Contracts.P2P.ApiNode): void {
		this.#apiNodes.set(apiNode.ip, apiNode);
	}

	public forgetApiNode(apiNode: Contracts.P2P.ApiNode): void {
		this.#apiNodes.delete(apiNode.ip);
	}

	public setPendingApiNode(apiNode: Contracts.P2P.ApiNode): void {
		this.#apiNodesPending.set(apiNode.ip, apiNode);
	}

	public forgetPendingApiNode(apiNode: Contracts.P2P.ApiNode): void {
		this.#apiNodesPending.delete(apiNode.ip);
	}

	public hasPendingApiNode(apiNode: Contracts.P2P.ApiNode): boolean {
		return this.#apiNodesPending.has(apiNode.ip);
	}
}
