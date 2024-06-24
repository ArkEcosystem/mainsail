import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

@injectable()
export class TxPoolNode implements Contracts.P2P.TxPoolNode {
	public ip!: string;
	public port!: number;

	public init(ip: string, port: number): TxPoolNode {
		this.ip = ip;
		this.port = port;

		return this;
	}

	public get url(): string {
		return `http://${this.ip}:${this.port}/`;
	}
}
