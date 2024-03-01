import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
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
					data: { type: "string" },
					from: { type: "string" },
					to: { type: "string" },
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

		const txContext = {
			caller: data.from,
			data: Buffer.from(ethers.getBytes(data.data)),
			recipient: data.to,
		};

		const result = await this.evm.view(txContext);

		if (result.success) {
			return `0x${result.output?.toString("hex")}`;
		}

		return `OK ${this.name}`;
	}
}
