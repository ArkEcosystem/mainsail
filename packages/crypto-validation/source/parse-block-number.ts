import type { AnySchemaObject } from "ajv";

export const parseBlockNumber = (path: string, parentSchema: AnySchemaObject): number | undefined => {
	if (path === undefined) {
		return undefined;
	}

	if (path === "payloadSerialized") {
		return parseSerializedPayload(parentSchema.rootData?.payloadSerialized);
	}

	return parseOnPath(path, parentSchema.rootData);
};

const parseOnPath = (path: string, rootData: object): number | undefined => {
	const parts = path.split(".");
	let current: any = rootData;

	for (const part of parts) {
		if (current[part] === undefined) {
			return undefined;
		}
		current = current[part];
	}

	if(typeof current === "number") {
		return current;
	}

	return undefined;
}

// Proposals contain the block only in serialized form (hex).
// We can extract the block number at a fixed offset here, without needing to deserialize the whole block.
const parseSerializedPayload = (serialized): number | undefined => {
	if (!serialized) {
		return undefined;
	}

	if (serialized.length < 30) {
		return undefined;
	}

	const lockProofSize = 2 + Number.parseInt(serialized.slice(0, 2), 16) * 2;
	// version: 1 byte (2 hex)
	// timestamp: 6 bytes (12 hex)
	// blockNumber: 4 byte (8 hex)
	const offset = lockProofSize + 2 + 12;
	return Buffer.from(serialized.slice(offset, offset + 8), "hex").readUInt32LE();
}
