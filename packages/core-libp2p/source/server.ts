import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import libp2p from "libp2p";

@injectable()
export class Server {
	@inject(Identifiers.Application)
	private readonly app: Contracts.Kernel.Application;

	@inject(Identifiers.LogService)
	private readonly logger: Contracts.Kernel.Logger;

	private server: libp2p;

	public async register(options: libp2p.Libp2pOptions): Promise<void> {
		this.server = await libp2p.create(options);
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

	public listen(event: string, listener: (...arguments_: any[]) => void): void {
		this.server.pubsub.on(event, listener);
	}

	public unlisten(event: string, listener: (...arguments_: any[]) => void): void {
		this.server.pubsub.off(event, listener);
	}

	public subscribe(topic: string): void {
		this.server.pubsub.subscribe(topic);
	}

	public unsubscribe(topic: string): void {
		this.server.pubsub.unsubscribe(topic);
	}
}
