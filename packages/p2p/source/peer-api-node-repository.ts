import { inject, injectable, postConstruct, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers, Utils } from "@mainsail/kernel";

@injectable()
export class PeerApiNodeRepository implements Contracts.P2P.PeerApiNodeRepository {
	@inject(Identifiers.PluginConfiguration)
	@tagged("plugin", "p2p")
	private readonly configuration!: Providers.PluginConfiguration;

	readonly #apiNodes: Map<string, Contracts.P2P.PeerApiNode> = new Map<string, Contracts.P2P.PeerApiNode>();

	@postConstruct()
	public postConstruct() {
		const apiNodes = this.configuration.getOptional<string[]>("apiNodes", []);

		for (const item of apiNodes) {
			const [ip, port] = item.split(":");
			Utils.assert.defined<string>(ip);
			Utils.assert.defined<string>(port);
			this.setApiNode({ ip, port: Number(port) });
		}
	}

	public getApiNodes(): Contracts.P2P.PeerApiNodes {
		return [...this.#apiNodes.values()];
	}

	public setApiNode(apiNode: Contracts.P2P.PeerApiNode): void {
		this.#apiNodes.set(apiNode.ip, apiNode);
	}

	public forgetApiNode(apiNode: Contracts.P2P.PeerApiNode): void {
		this.#apiNodes.delete(apiNode.ip);
	}
}
