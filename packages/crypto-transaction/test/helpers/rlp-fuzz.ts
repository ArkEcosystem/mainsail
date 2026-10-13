import { toBytesCompat } from "../../source/serializer.js";
import { encodeLegacy, encodeList, encodeRlp } from "./canonical-transaction.js";

export const createRandom = (seed: number) => () => {
	seed = (seed + 0x6d_2b_79_f5) | 0;
	let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
	t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
	return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
};

type Random = ReturnType<typeof createRandom>;

const randomInt = (random: Random, max: number): number => Math.floor(random() * (max + 1));

const pick = <T>(random: Random, values: T[]): T => values[randomInt(random, values.length - 1)];

const randomBytes = (random: Random, length: number): Uint8Array =>
	Uint8Array.from({ length }, () => randomInt(random, 255));

const randomInteger = (random: Random, minBytes: number, maxBytes: number): Uint8Array => {
	const bytes = randomBytes(random, minBytes + randomInt(random, maxBytes - minBytes));
	if (bytes.length > 0 && bytes[0] === 0) {
		bytes[0] = 1;
	}
	return bytes;
};

const randomLength = (random: Random): number =>
	pick(random, [0, 1, 2, 20, 32, 33, 55, 56, 65, 255, 256, randomInt(random, 300)]);

export const randomFields = (random: Random): Uint8Array[] => {
	const fields = [
		randomInteger(random, 0, 8),
		randomInteger(random, 0, 6),
		randomInteger(random, 0, 4),
		random() < 0.5 ? new Uint8Array() : randomBytes(random, 20),
		randomInteger(random, 0, 32),
		randomBytes(random, randomLength(random)),
		toBytesCompat(35 + randomInt(random, 16_777_215)),
		randomInteger(random, 1, 32),
		randomInteger(random, 1, 32),
	];
	return random() < 0.5 ? [...fields, randomBytes(random, 65)] : fields;
};

const longHeader = (random: Random, offset: 0x80 | 0xc0, length: number): number[] => {
	const lengthBytes = [...toBytesCompat(length)];
	const minimum = length < 56 ? 1 : lengthBytes.length + 1;
	const lengthOfLength = minimum + randomInt(random, 8 - minimum);
	const padding = Array.from({ length: lengthOfLength - lengthBytes.length }, () => 0);
	if (padding.length > 0 && random() < 0.5) {
		padding[0] = 1 + randomInt(random, 254);
	}
	return [offset + 55 + lengthOfLength, ...padding, ...lengthBytes];
};

export const MUTATIONS: [string, (random: Random, fields: Uint8Array[]) => Buffer][] = [
	[
		"header",
		(random, fields) => {
			const items = fields.map((field) => encodeRlp(field));
			if (random() < 0.5) {
				const payload = Buffer.concat(items);
				return Buffer.concat([Buffer.from(longHeader(random, 0xc0, payload.length)), payload]);
			}

			const target = randomInt(random, fields.length - 1);
			const field = fields[target];
			const header =
				field.length === 1 && field[0] < 0x80 && random() < 0.5
					? [0x81]
					: longHeader(random, 0x80, field.length);
			items[target] = Buffer.concat([Buffer.from(header), field]);
			return encodeList(items);
		},
	],
	[
		"append",
		(random, fields) =>
			encodeLegacy([
				...fields,
				...Array.from({ length: 1 + randomInt(random, 1) }, () =>
					randomBytes(random, pick(random, [0, 1, 65, randomInt(random, 80)])),
				),
			]),
	],
	[
		"replace",
		(random, fields) => {
			const bytes = randomBytes(random, randomLength(random));
			if (bytes.length > 0 && random() < 0.5) {
				bytes[0] = 0;
			}

			const replaced = [...fields];
			replaced[randomInt(random, fields.length - 1)] = bytes;
			return encodeLegacy(replaced);
		},
	],
	[
		"bytes",
		(random, fields) => {
			const bytes = [...encodeLegacy(fields)];
			const position = randomInt(random, bytes.length - 1);
			switch (randomInt(random, 4)) {
				case 0: {
					bytes[position] = randomInt(random, 255);
					break;
				}
				case 1: {
					bytes.splice(position, 0, randomInt(random, 255));
					break;
				}
				case 2: {
					bytes.splice(position, 1);
					break;
				}
				case 3: {
					bytes.splice(position);
					break;
				}
				default: {
					bytes.push(...randomBytes(random, 1 + randomInt(random, 7)));
				}
			}
			return Buffer.from(bytes);
		},
	],
];
