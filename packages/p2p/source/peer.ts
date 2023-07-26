import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Types, Utils } from "@mainsail/kernel";
import dayjs, { Dayjs } from "dayjs";

import { PeerVerificationResult } from "./peer-verifier-old";

@injectable()
export class Peer implements Contracts.P2P.Peer {
	@inject(Identifiers.QueueFactory)
	private readonly createQueue!: Types.QueueFactory;

	public ip!: string;

	public port!: number;

	public readonly ports: Contracts.P2P.PeerPorts = {};

	public version: string | undefined;

	public latency: number | undefined;

	public lastPinged: Dayjs | undefined;

	public sequentialErrorCounter = 0;

	public verificationResult: PeerVerificationResult | undefined;

	public plugins: Contracts.P2P.PeerPlugins = {};

	#state: Contracts.P2P.IHeaderData | undefined;

	#transactionsQueue!: Contracts.Kernel.Queue;

	public init(ip: string, port: number): Peer {
		this.ip = ip;
		this.port = port;

		return this;
	}

	public get url(): string {
		return `${this.port % 443 === 0 ? "https://" : "http://"}${this.ip}:${this.port}`;
	}

	public get state(): Contracts.P2P.IHeaderData {
		// State can be undefined when the peer is not yet verified.
		Utils.assert.defined<Contracts.P2P.IHeaderData>(this.#state);

		return this.#state;
	}

	public set state(state: Contracts.P2P.IHeaderData) {
		this.#state = state;
	}

	public isVerified(): boolean {
		return this.verificationResult instanceof PeerVerificationResult;
	}

	public isForked(): boolean {
		return !!(this.isVerified() && this.verificationResult && this.verificationResult.forked);
	}

	public recentlyPinged(): boolean {
		return !!this.lastPinged && dayjs().diff(this.lastPinged, "minute") < 2;
	}

	public toBroadcast(): Contracts.P2P.PeerBroadcast {
		return {
			ip: this.ip,
			port: this.port,
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
