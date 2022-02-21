import { BlockSchemaError } from "@arkecosystem/crypto-errors";
import { IBlockData } from "@arkecosystem/crypto-contracts";
import { BigNumber } from "@arkecosystem/utils";
import { Validator } from "@arkecosystem/validation";

export const toBytesHex = (data): string => {
	const temp: string = data ? BigNumber.make(data).toString(16) : "";

	return "0".repeat(16 - temp.length) + temp;
};

export const applySchema = async (data: IBlockData): Promise<IBlockData | undefined> => {
	let result = await new Validator({}).validate("block", data);

	if (!result.error) {
		return result.value;
	}

	for (const err of result.errors) {
		let fatal = false;

		const match = err.dataPath.match(/\.transactions\[(\d+)]/);
		if (match === null) {
			fatal = true;
		} else {
			const txIndex = match[1];

			if (data.transactions) {
				const tx = data.transactions[txIndex];

				if (tx.id === undefined) {
					fatal = true;
				}
			}
		}

		if (fatal) {
			throw new BlockSchemaError(
				data.height,
				`Invalid data${err.dataPath ? " at " + err.dataPath : ""}: ` +
					`${err.message}: ${JSON.stringify(err.data)}`,
			);
		}
	}

	return result.value;
};
