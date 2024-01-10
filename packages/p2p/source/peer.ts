import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Types, Utils } from "@mainsail/kernel";
import dayjs, { Dayjs } from "dayjs";

import { getPeerUrl } from "./utils/get-peer-url";

@injectable()
export class Peer implements Contracts.P2P.Peer {
	@inject(Identifiers.Kernel.Queue.Factory)
	private readonly createQueue!: Types.QueueFactory;

	public ip!: string;

	public port!: number;

	public protocol!: Contracts.P2P.PeerProtocol;

	public readonly ports: Contracts.P2P.PeerPorts = {};

	public version: string | undefined;

	public latency: number | undefined;

	public lastPinged: Dayjs | undefined;

	public sequentialErrorCounter = 0;

	public plugins: Contracts.P2P.PeerPlugins = {};

	public apiNodes: Contracts.P2P.PeerApiNodes = [];

	#header: Contracts.P2P.HeaderData | undefined;

	#transactionsQueue!: Contracts.Kernel.Queue;

	public init(ip: string, port: number): Peer {
		this.ip = ip;
		this.port = port;
		this.protocol = Contracts.P2P.PeerProtocol.Http;

		return this;
	}

	public get url(): string {
		return getPeerUrl(this);
	}

	public get header(): Contracts.P2P.HeaderData {
		// State can be undefined when the peer is not yet verified.
		Utils.assert.defined<Contracts.P2P.HeaderData>(this.#header);

		return this.#header;
	}

	public set header(header: Contracts.P2P.HeaderData) {
		this.#header = header;
	}

	public recentlyPinged(): boolean {
		return !!this.lastPinged && dayjs().diff(this.lastPinged, "minute") < 2;
	}

	public toBroadcast(): Contracts.P2P.PeerBroadcast {
		return {
			ip: this.ip,
			port: this.port,
			protocol: this.protocol,
		};
	}

	public async getTransactionsQueue(): Promise<Contracts.Kernel.Queue> {
		if (!this.#transactionsQueue) {
			this.#transactionsQueue = await this.createQueue();
		}

		return this.#transactionsQueue;
	}

	public dispose(): void {
		if (this.#transactionsQueue) {
			void this.#transactionsQueue.stop();
		}
	}
}
