import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

@injectable()
export class ApiNode implements Contracts.P2P.ApiNode {
	public url!: string;

	statusCode?: number;
	latency?: number;

	constructor() {}

	public init(url: string): ApiNode {
		this.url = url;

		return this;
	}
}

@injectable()
export class ApiNodeRepository implements Contracts.P2P.ApiNodeRepository {
	readonly #apiNodes: Map<string, Contracts.P2P.ApiNode> = new Map<string, Contracts.P2P.ApiNode>();
	readonly #apiNodesPending: Map<string, Contracts.P2P.ApiNode> = new Map<string, Contracts.P2P.ApiNode>();

	public getApiNodes(): Contracts.P2P.ApiNode[] {
		return [...this.#apiNodes.values()];
	}

	public hasApiNode(apiNode: Contracts.P2P.ApiNode): boolean {
		return this.#apiNodes.has(apiNode.url);
	}

	public setApiNode(apiNode: Contracts.P2P.ApiNode): void {
		this.#apiNodes.set(apiNode.url, apiNode);
	}

	public forgetApiNode(apiNode: Contracts.P2P.ApiNode): void {
		this.#apiNodes.delete(apiNode.url);
	}

	public setPendingApiNode(apiNode: Contracts.P2P.ApiNode): void {
		this.#apiNodesPending.set(apiNode.url, apiNode);
	}

	public forgetPendingApiNode(apiNode: Contracts.P2P.ApiNode): void {
		this.#apiNodesPending.delete(apiNode.url);
	}

	public hasPendingApiNode(apiNode: Contracts.P2P.ApiNode): boolean {
		return this.#apiNodesPending.has(apiNode.url);
	}
}
