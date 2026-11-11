import type { Contracts } from "@mainsail/contracts";
import type { Interfaces } from "@mainsail/p2p-websocket";

import { Enums, Events, Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { assert } from "@mainsail/utils";
import dayjs from "dayjs";

import type { Peer as PeerInterface } from "./interfaces/index.js";

import { getPeerUrl } from "./utils/get-peer-url.js";

@injectable()
export class Peer implements PeerInterface {
	@inject(Identifiers.Services.EventDispatcher.Service)
	private readonly events!: Contracts.Kernel.EventDispatcher;

	public ip!: string;

	public port!: number;

	public protocol!: Contracts.P2PService.PeerProtocol;

	public readonly ports: Contracts.P2PService.PeerPorts = {};

	public version: string | undefined;

	public latency: number | undefined;

	public lastPinged: number | undefined;

	public plugins: Contracts.P2PService.PeerPlugins = {};

	public connection?: Interfaces.Connection;

	public lastDialAt?: number;

	#header: Contracts.P2PService.HeaderData | undefined;

	public init(ip: string, port: number): Peer {
		this.ip = ip;
		this.port = port;
		this.protocol = Enums.Api.Protocol.Http;

		return this;
	}

	public get url(): string {
		return getPeerUrl(this);
	}

	public get header(): Contracts.P2PService.HeaderData {
		// State can be undefined when the peer is not yet verified.
		assert.defined(this.#header);

		return this.#header;
	}

	public set header(header: Contracts.P2PService.HeaderData) {
		const previousHeader = this.#header;

		this.#header = header;

		if (previousHeader === undefined) {
			return;
		}

		const changed =
			previousHeader.blockNumber !== this.#header.blockNumber || previousHeader.version !== this.#header.version;
		if (changed) {
			void this.events.dispatch(Events.PeerEvent.Updated, this);
		}
	}

	public setPinged(latency: number): void {
		this.lastPinged = dayjs().valueOf();
		this.latency = latency;
	}

	public toBroadcast(): Contracts.P2PService.PeerBroadcast {
		return {
			ip: this.ip,
			port: this.port,
			protocol: this.protocol,
		};
	}
}
