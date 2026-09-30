// Copied form ajv and modified
interface DataValidationCxt {
	rootData: Record<string, unknown> | unknown[];
}

const parseOnPath = (path: string, rootData: object): number | undefined => {
	const parts = path.split(".");
	let current = rootData;

	for (const part of parts) {
		if (typeof current !== "object" || current === null || current[part] === undefined) {
			return undefined;
		}
		current = current[part];
	}

	if (typeof current === "number") {
		return current;
	}

	return undefined;
};

// Proposals contain the block only in serialized form (hex).
// We can extract the block number at a fixed offset here, without needing to deserialize the whole block.
const parseSerializedPayload = (serialized: unknown): number | undefined => {
	if (typeof serialized !== "string" || serialized.length < 30) {
		return undefined;
	}

	const lockProofSize = 2 + Number.parseInt(serialized.slice(0, 2), 16) * 2;
	// version: 1 byte (2 hex)
	// timestamp: 6 bytes (12 hex)
	// blockNumber: 4 byte (8 hex)
	const offset = lockProofSize + 2 + 12;

	// A malformed lock-proof prefix (non-hex → NaN) or a payload shorter than the
	// computed offset would otherwise make readUInt32LE throw. Fail closed instead.
	if (!Number.isInteger(offset) || offset + 8 > serialized.length) {
		return undefined;
	}

	try {
		return Buffer.from(serialized.slice(offset, offset + 8), "hex").readUInt32LE();
	} catch {
		// Invalid hex in the block-number region yields a short buffer; treat as missing.
		return undefined;
	}
};

export const parseBlockNumber = (
	path: string | undefined,
	parentSchema: DataValidationCxt | undefined,
): number | undefined => {
	if (path === undefined || parentSchema === undefined) {
		return undefined;
	}

	if (path === "payloadSerialized") {
		return parseSerializedPayload(parentSchema.rootData?.["payloadSerialized"]);
	}

	return parseOnPath(path, parentSchema.rootData);
};
