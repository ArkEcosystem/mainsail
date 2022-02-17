import { Contracts } from "@arkecosystem/core-kernel";
import dayjs, { Dayjs } from "dayjs";

import { PeerVerificationResult } from "./peer-verifier";

export class Peer implements Contracts.P2P.Peer {
	public readonly ports: Contracts.P2P.PeerPorts = {};

	public version: string | undefined;

	public latency: number | undefined;

	public lastPinged: Dayjs | undefined;

	public sequentialErrorCounter: number = 0;

	public verificationResult: PeerVerificationResult | undefined;

	public state: Contracts.P2P.PeerState = {
		height: undefined,
		forgingAllowed: undefined,
		currentSlot: undefined,
		header: {},
	};

	public plugins: Contracts.P2P.PeerPlugins = {};

	public constructor(public readonly ip: string, public readonly port: number) {}

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
