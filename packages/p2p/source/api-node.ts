import { injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";

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
