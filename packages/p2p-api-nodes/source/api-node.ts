import type { Contracts } from "@mainsail/contracts";
import type { Dayjs } from "dayjs";

import { injectable } from "@mainsail/container";

@injectable()
export class ApiNode implements Contracts.P2PApiNodes.ApiNode {
	public url!: string;

	public statusCode?: number;
	public latency?: number;
	public lastPinged?: Dayjs;
	public remoteAddress?: string;

	public init(url: string): ApiNode {
		this.url = url;

		return this;
	}
}
