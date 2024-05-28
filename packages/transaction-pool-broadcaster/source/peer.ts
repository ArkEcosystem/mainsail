import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import dayjs, { Dayjs } from "dayjs";

@injectable()
export class Peer implements Contracts.TransactionPool.Peer {
	public ip!: string;
	public port!: number;
	public protocol!: Contracts.TransactionPool.PeerProtocol;
	public version: string | undefined;
	public latency: number | undefined;
	public lastPinged: Dayjs | undefined;

	public init(ip: string, port: number): Peer {
		this.ip = ip;
		this.port = port;
		this.protocol = Contracts.TransactionPool.PeerProtocol.Http;

		return this;
	}

	public get url(): string {
		return `${this.protocol === Contracts.TransactionPool.PeerProtocol.Https ? "https" : "http"}://${this.ip}:${this.port}`;
	}

	public recentlyPinged(): boolean {
		return !!this.lastPinged && dayjs().diff(this.lastPinged, "minute") < 2;
	}

	public toBroadcast(): Contracts.TransactionPool.PeerBroadcast {
		return {
			ip: this.ip,
			port: this.port,
			protocol: this.protocol,
		};
	}
}
