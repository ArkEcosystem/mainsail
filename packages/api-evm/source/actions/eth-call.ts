import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import { ethers } from "ethers";

type TxData = {
	from?: string;
	to: string;
	data: string;
	gas?: string;
};

@injectable()
export class CallAction implements Contracts.Api.RPC.Action {
	@inject(Identifiers.Evm.Instance)
	@tagged("instance", "rpc")
	private readonly evm!: Contracts.Evm.Instance;

	public readonly name: string = "eth_call";

	public readonly schema = {
		$id: `jsonRpc_${this.name}`,

		maxItems: 2,
		minItems: 2,

		prefixItems: [
			{
				additionalProperties: false,
				properties: {
					data: { $ref: "prefixedHex" },
					from: { $ref: "address" },
					gas: { $ref: "prefixedHex" },
					gasPrice: { $ref: "prefixedHex" },
					to: { $ref: "address" },
					value: { $ref: "prefixedHex" },
				},
				required: ["to", "data"],
				type: "object",
			},
			{ $ref: "blockTag" },
		],

		type: "array",
	};

	public async handle(parameters: [TxData, Contracts.Crypto.BlockTag]): Promise<any> {
		const [data] = parameters;

		const { success, output } = await this.evm.view({
			caller: data.from ?? "0x" + "0".repeat(40), // default to zero address
			data: Buffer.from(ethers.getBytes(data.data)),
			gasLimit: data.gas ? BigInt(data.gas) : undefined,
			recipient: data.to,
			specId: Contracts.Evm.SpecId.LATEST,
		});

		if (success) {
			return `0x${output?.toString("hex")}`;
		}

		throw new Exceptions.RpcError("execution reverted");
	}
}
