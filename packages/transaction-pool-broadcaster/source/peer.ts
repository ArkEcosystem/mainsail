import type { Contracts } from "@mainsail/contracts";

import { Enums } from "@mainsail/constants";
import { injectable } from "@mainsail/container";
import { Dayjs } from "dayjs";

@injectable()
export class Peer implements Contracts.TransactionPool.Peer {
	public ip!: string;
	public port!: number;
	public protocol!: Contracts.TransactionPool.PeerProtocol;
	public lastPinged: Dayjs | undefined;
	public errorCount = 0;

	public init(ip: string, port: number): Peer {
		this.ip = ip;
		this.port = port;
		this.protocol = Enums.Api.Protocol.Http;

		return this;
	}

	public get url(): string {
		return `${this.protocol === Enums.Api.Protocol.Https ? "https" : "http"}://${this.ip}:${this.port}`;
	}
}
