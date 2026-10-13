import { validatorSetPack, validatorSetUnpack } from "@mainsail/utils";

type Bitmap = readonly boolean[];
type BitmapFields = { validatorsSignedPrevote?: unknown; validatorsSignedPrecommit?: unknown };

export const packBitmap = (bitmap: Bitmap): Buffer => {
	if (bitmap.length > 255) {
		throw new RangeError(`Bitmap of ${bitmap.length} validators does not fit the count byte`);
	}

	const packed = Buffer.alloc(1 + Math.ceil(bitmap.length / 8));
	packed[0] = bitmap.length;

	let value = validatorSetPack(bitmap as boolean[]);
	for (let index = 1; value > 0n; index++) {
		packed[index] = Number(value & 0xffn);
		value >>= 8n;
	}

	return packed;
};

export const unpackBitmap = (packed: Uint8Array | null | undefined): boolean[] => {
	if (!packed || packed.length === 0) {
		return [];
	}

	const count = packed[0];
	if (packed.length !== 1 + Math.ceil(count / 8)) {
		throw new Error(
			`Bitmap of ${count} validators must be ${1 + Math.ceil(count / 8)} bytes, got ${packed.length}`,
		);
	}

	let value = 0n;
	for (let index = packed.length - 1; index >= 1; index--) {
		value = (value << 8n) | BigInt(packed[index]);
	}

	return validatorSetUnpack(value, count);
};

export const packBitmaps = <T extends BitmapFields>(object: T): T =>
	({
		...object,
		validatorsSignedPrecommit: packBitmap((object.validatorsSignedPrecommit ?? []) as Bitmap),
		validatorsSignedPrevote: packBitmap((object.validatorsSignedPrevote ?? []) as Bitmap),
	}) as T;

export const packHeadersBitmaps = <T extends { headers?: unknown }>(object: T): T =>
	object.headers ? ({ ...object, headers: packBitmaps(object.headers as BitmapFields) } as T) : object;

export const unpackBitmapsInPlace = (object: BitmapFields | null | undefined): void => {
	if (object) {
		object.validatorsSignedPrevote = unpackBitmap(object.validatorsSignedPrevote as Uint8Array);
		object.validatorsSignedPrecommit = unpackBitmap(object.validatorsSignedPrecommit as Uint8Array);
	}
};

export const unpackHeadersBitmaps = (object: { headers?: unknown }): void => {
	unpackBitmapsInPlace(object.headers as BitmapFields | null | undefined);
};
