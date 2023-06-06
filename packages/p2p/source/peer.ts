import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import dayjs, { Dayjs } from "dayjs";

import { PeerVerificationResult } from "./peer-verifier";

@injectable()
export class Peer implements Contracts.P2P.Peer {
	public ip!: string;

	public port!: number;

	public readonly ports: Contracts.P2P.PeerPorts = {};

	public version: string | undefined;

	public latency: number | undefined;

	public lastPinged: Dayjs | undefined;

	public sequentialErrorCounter = 0;

	public verificationResult: PeerVerificationResult | undefined;

	public state: Contracts.P2P.PeerState = {
		currentSlot: undefined,
		forgingAllowed: undefined,
		header: {},
		height: undefined,
	};

	public plugins: Contracts.P2P.PeerPlugins = {};

	public init(ip: string, port: number): Peer {
		this.ip = ip;
		this.port = port;

		return this;
	}

	public get url(): string {
		return `${this.port % 443 === 0 ? "https://" : "http://"}${this.ip}:${this.port}`;
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
}
