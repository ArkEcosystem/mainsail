import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { NOISE } from "@chainsafe/libp2p-noise";
import libp2p from "libp2p";
import Bootstrap from "libp2p-bootstrap";
import Gossipsub from "libp2p-gossipsub";
// import MPLEX from 'libp2p-mplex';
import TCP from "libp2p-tcp";
import WS from "libp2p-websockets";

@injectable()
export class Server {
	@inject(Identifiers.Application)
	private readonly app: Contracts.Kernel.Application;

	@inject(Identifiers.LogService)
	private readonly logger: Contracts.Kernel.Logger;

	private server: libp2p;

	public async register(): Promise<void> {
		this.server = await libp2p.create({
			addresses: {
				listen: ["/ip4/0.0.0.0/tcp/0"], // @TODO: grab from config
			},
			config: {
				peerDiscovery: {
					autoDial: true,
					[Bootstrap.tag]: {
						enabled: true,
						list: [], // @TODO: grab from config
					},
				},
				pubsub: {
					emitSelf: true, // @TODO: only true for debug/test/dev, add a flag
					enabled: true,
				},
			},
			// @ts-ignore
			modules: {
				connEncryption: [NOISE],
				// peerDiscovery: [Bootstrap],
				pubsub: Gossipsub,
				// @TODO: this errors because the interface and implementation don't match
				// streamMuxer: [MPLEX],
				transport: [TCP, WS],
			},
		});
	}

	public async boot(): Promise<void> {
		try {
			await this.server.pubsub.start();

			await this.server.start();

			for (const addr of this.server.multiaddrs) {
				this.logger.info(
					`P2P server started listening on address: ${addr.toString()}/p2p/${this.server.peerId.toB58String()}`,
				);
			}
		} catch {
			await this.app.terminate(`Failed to start P2P server!`);
		}
	}

	public async dispose(): Promise<void> {
		try {
			for (const addr of this.server.multiaddrs) {
				this.logger.info(
					`P2P server stopped listening on address: ${addr.toString()}/p2p/${this.server.peerId.toB58String()}`,
				);
			}

			await this.server.stop();
		} catch {
			await this.app.terminate(`Failed to stop P2P server!`);
		}
	}

	public listen(event: string, listener: (...args: any[]) => void): void {
		this.server.pubsub.on(event, listener);
	}

	public unlisten(event: string, listener: (...args: any[]) => void): void {
		this.server.pubsub.off(event, listener);
	}

	public subscribe(topic: string): void {
		this.server.pubsub.subscribe(topic);
	}

	public unsubscribe(topic: string): void {
		this.server.pubsub.unsubscribe(topic);
	}
}
