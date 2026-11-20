import type { Contracts } from "@mainsail/contracts";

import { injectable } from "@mainsail/container";
import { IpAddress } from "@mainsail/utils";

import { constants } from "./constants.js";
import { isPublicHttpUrl } from "./utils/index.js";

@injectable()
export class ApiNodeRepository implements Contracts.P2PApiNodes.ApiNodeRepository {
	readonly #apiNodes = new Map<string, Contracts.P2PApiNodes.ApiNode>();
	readonly #apiNodesPending = new Map<string, Contracts.P2PApiNodes.ApiNode>();

	public getApiNodes(): Contracts.P2PApiNodes.ApiNode[] {
		return [...this.#apiNodes.values()];
	}

	// A configured node may have a non-public address; it is used here but not passed on to peers.
	public getPublicApiNodes(): Contracts.P2PApiNodes.ApiNodeBroadcast[] {
		return this.getApiNodes()
			.filter((apiNode) => !!apiNode.latency && apiNode.statusCode === 200)
			.filter((apiNode) => isPublicHttpUrl(apiNode.url))
			.filter((apiNode) => apiNode.remoteAddress !== undefined && IpAddress.isPublicIp(apiNode.remoteAddress))
			.filter((apiNode) => apiNode.url.length <= constants.MAX_API_NODE_URL_LENGTH)
			.sort((a, b) => (a.latency ?? 0) - (b.latency ?? 0))
			.slice(0, constants.MAX_API_NODES_PER_PEER)
			.map((apiNode) => ({ url: apiNode.url }));
	}

	public hasApiNode(apiNode: Contracts.P2PApiNodes.ApiNode): boolean {
		return this.#apiNodes.has(apiNode.url);
	}

	public setApiNode(apiNode: Contracts.P2PApiNodes.ApiNode): void {
		this.#apiNodes.set(apiNode.url, apiNode);
	}

	public forgetApiNode(apiNode: Contracts.P2PApiNodes.ApiNode): void {
		this.#apiNodes.delete(apiNode.url);
	}

	public setPendingApiNode(apiNode: Contracts.P2PApiNodes.ApiNode): void {
		this.#apiNodesPending.set(apiNode.url, apiNode);
	}

	public forgetPendingApiNode(apiNode: Contracts.P2PApiNodes.ApiNode): void {
		this.#apiNodesPending.delete(apiNode.url);
	}

	public hasPendingApiNode(apiNode: Contracts.P2PApiNodes.ApiNode): boolean {
		return this.#apiNodesPending.has(apiNode.url);
	}
}
