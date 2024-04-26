import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import { ethers } from "ethers";

type BlockTag = "latest" | "earliest" | "pending";

type TxData = {
	from: string;
	to: string;
	data: string;
};

@injectable()
export class CallAction implements Contracts.Api.RPC.Action {
	@inject(Identifiers.Evm.Instance)
	@tagged("instance", "evm")
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
					to: { $ref: "address" },
				},
				required: ["from", "to", "data"],
				type: "object",
			},
			{ enum: ["latest", "earliest", "pending"], type: "string" },
		],

		type: "array",
	};

	public async handle(parameters: [TxData, BlockTag]): Promise<any> {
		const [data] = parameters;

		const { receipt } = await this.evm.process({
			caller: data.from,
			data: Buffer.from(ethers.getBytes(data.data)),
			recipient: data.to,
		});

		if (receipt.success) {
			return `0x${receipt.output?.toString("hex")}`;
		}

		throw new Exceptions.RpcError("execution reverted");
	}
}