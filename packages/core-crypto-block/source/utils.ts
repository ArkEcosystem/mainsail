import { IBlockData } from "@arkecosystem/core-crypto-contracts";
import { BlockSchemaError } from "@arkecosystem/core-crypto-errors";
import { BigNumber } from "@arkecosystem/utils";
import { Validator } from "@arkecosystem/core-validation";

export const toBytesHex = (data): string => {
	const temporary: string = data ? BigNumber.make(data).toString(16) : "";

	return "0".repeat(16 - temporary.length) + temporary;
};

export const applySchema = async (data: IBlockData): Promise<IBlockData | undefined> => {
	const result = await new Validator().validate("block", data);

	if (!result.error) {
		return result.value;
	}

	for (const error of result.errors) {
		let fatal = false;

		const match = error.dataPath.match(/\.transactions\[(\d+)]/);
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
				`Invalid data${error.dataPath ? " at " + error.dataPath : ""}: ` +
					`${error.message}: ${JSON.stringify(error.data)}`,
			);
		}
	}

	return result.value;
};
