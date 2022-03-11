import { ByteBuffer } from "./byte-buffer";
import { Buffer } from "buffer";
import { describe } from "@arkecosystem/core-test-framework";

describe("ByteBuffer", ({ it, assert }) => {
	it("result - should return valid result & result length", () => {
		const buffer = Buffer.alloc(2);
		const byteBuffer = new ByteBuffer(buffer);

		assert.equal(byteBuffer.getResultLength(), 0);
		assert.equal(Buffer.alloc(0).compare(byteBuffer.getResult()), 0);

		byteBuffer.writeInt8(1);

		assert.equal(byteBuffer.getResultLength(), 1);
		const tmpBuffer1 = Buffer.alloc(1);
		tmpBuffer1.writeInt8(1);
		assert.equal(tmpBuffer1.compare(byteBuffer.getResult()), 0);

		byteBuffer.writeInt8(2);

		assert.equal(byteBuffer.getResultLength(), 2);
		const tmpBuffer2 = Buffer.alloc(2);
		tmpBuffer2.writeInt8(1);
		tmpBuffer2.writeInt8(2, 1);
		assert.equal(tmpBuffer2.compare(byteBuffer.getResult()), 0);
	});

	it("reminder - should return valid remainders and remainder length", () => {
		const buffer = Buffer.alloc(2);
		const byteBuffer = new ByteBuffer(buffer);

		byteBuffer.writeInt8(1);
		byteBuffer.writeInt8(2);
		byteBuffer.reset();

		assert.equal(byteBuffer.getRemainderLength(), 2);
		const tmpBuffer1 = Buffer.alloc(2);
		tmpBuffer1.writeInt8(1);
		tmpBuffer1.writeInt8(2, 1);
		assert.equal(tmpBuffer1.compare(byteBuffer.getRemainder()), 0);

		byteBuffer.readInt8();

		assert.equal(byteBuffer.getRemainderLength(), 1);
		const tmpBuffer2 = Buffer.alloc(1);
		tmpBuffer2.writeInt8(2);
		assert.equal(tmpBuffer2.compare(byteBuffer.getRemainder()), 0);

		byteBuffer.readInt8();

		assert.equal(byteBuffer.getRemainderLength(), 0);
		assert.equal(Buffer.alloc(0).compare(byteBuffer.getRemainder()), 0);
	});

	it("jump - should jump", () => {
		const buffer = Buffer.alloc(1);
		const byteBuffer = new ByteBuffer(buffer);

		assert.equal(byteBuffer.getResultLength(), 0);

		byteBuffer.jump(1);
		assert.equal(byteBuffer.getResultLength(), 1);

		byteBuffer.jump(-1);
		assert.equal(byteBuffer.getResultLength(), 0);
	});

	it("jump - should throw error when jumping outside boundary", () => {
		const buffer = Buffer.alloc(1);
		const byteBuffer = new ByteBuffer(buffer);

		assert.throws(() => byteBuffer.jump(2), "Jump over buffer boundary.");

		assert.throws(() => byteBuffer.jump(-1), "Jump over buffer boundary.");
	});
});

describe("Int8", ({ assert, each }) => {
	const bufferSize = 1;
	const min = -128;
	const max = 127;
	const validValues = [min, max];
	const invalidValues = [min - 1, max + 1];

	each(
		"should write and read value:",
		({ dataset }) => {
			const buffer = Buffer.alloc(bufferSize);

			const byteBuffer = new ByteBuffer(buffer);

			byteBuffer.writeInt8(dataset);
			assert.equal(byteBuffer.getResultLength(), bufferSize);

			byteBuffer.reset();
			assert.equal(byteBuffer.readInt8(), dataset);
			assert.equal(byteBuffer.getResultLength(), bufferSize);
		},
		validValues,
	);

	each(
		"should fail writing value:",
		({ dataset }) => {
			const buffer = Buffer.alloc(bufferSize);

			const byteBuffer = new ByteBuffer(buffer);

			assert.throws(() => {
				byteBuffer.writeInt8(dataset);
			}, `The value of "value" is out of range. It must be >= ${min} and <= ${max}. Received ${dataset}`);
			assert.equal(byteBuffer.getResultLength(), 0);
		},
		invalidValues,
	);
});

describe("UInt8", ({ each, assert }) => {
	const bufferSize = 1;
	const min = 0;
	const max = 255;
	const validValues = [min, max];
	const invalidValues = [min - 1, max + 1];

	each(
		"should write and read value: ",
		({ dataset }) => {
			const buffer = Buffer.alloc(bufferSize);

			const byteBuffer = new ByteBuffer(buffer);

			byteBuffer.writeUInt8(dataset);
			assert.equal(byteBuffer.getResultLength(), bufferSize);

			byteBuffer.reset();
			assert.equal(byteBuffer.readUInt8(), dataset);
			assert.equal(byteBuffer.getResultLength(), bufferSize);
		},
		validValues,
	);

	each(
		"should fail writing value: ",
		({ dataset }) => {
			const buffer = Buffer.alloc(bufferSize);

			const byteBuffer = new ByteBuffer(buffer);

			assert.throws(() => {
				byteBuffer.writeUInt8(dataset);
			}, `The value of "value" is out of range. It must be >= ${min} and <= ${max}. Received ${dataset}`);

			assert.equal(byteBuffer.getResultLength(), 0);
		},
		invalidValues,
	);
});

describe("Int16BE", ({ each, assert }) => {
	const bufferSize = 2;
	const min = -32768;
	const max = 32767;
	const validValues = [min, max];
	const invalidValues = [min - 1, max + 1];

	each(
		"should write and read value: ",
		({ dataset }) => {
			const buffer = Buffer.alloc(bufferSize);

			const byteBuffer = new ByteBuffer(buffer);

			byteBuffer.writeInt16BE(dataset);
			assert.equal(byteBuffer.getResultLength(), bufferSize);

			byteBuffer.reset();
			assert.equal(byteBuffer.readInt16BE(), dataset);
			assert.equal(byteBuffer.getResultLength(), bufferSize);
		},
		validValues,
	);

	each(
		"should fail writing value: ",
		({ dataset }) => {
			const buffer = Buffer.alloc(bufferSize);

			const byteBuffer = new ByteBuffer(buffer);

			assert.throws(() => {
				byteBuffer.writeInt16BE(dataset);
			}, `The value of "value" is out of range. It must be >= ${min} and <= ${max}. Received ${dataset}`);
			assert.equal(byteBuffer.getResultLength(), 0);
		},
		invalidValues,
	);
});

describe("UInt16BE", ({ each, assert }) => {
	const bufferSize = 2;
	const min = 0;
	const max = 65535;
	const validValues = [min, max];
	const invalidValues = [min - 1, max + 1];

	each(
		"should write and read value: ",
		({ dataset }) => {
			const buffer = Buffer.alloc(bufferSize);

			const byteBuffer = new ByteBuffer(buffer);

			byteBuffer.writeUInt16BE(dataset);
			assert.equal(byteBuffer.getResultLength(), bufferSize);

			byteBuffer.reset();
			assert.equal(byteBuffer.readUInt16BE(), dataset);
			assert.equal(byteBuffer.getResultLength(), bufferSize);
		},
		validValues,
	);

	each(
		"should fail writing value: ",
		({ dataset }) => {
			const buffer = Buffer.alloc(bufferSize);

			const byteBuffer = new ByteBuffer(buffer);

			assert.throws(() => {
				byteBuffer.writeUInt16BE(dataset);
			}, `The value of "value" is out of range. It must be >= ${min} and <= ${max}. Received ${dataset}`);
			assert.equal(byteBuffer.getResultLength(), 0);
		},
		invalidValues,
	);
});

describe("Int16LE", ({ each, assert }) => {
	const bufferSize = 2;
	const min = -32768;
	const max = 32767;
	const validValues = [min, max];
	const invalidValues = [min - 1, max + 1];

	each(
		"should write and read value: ",
		({ dataset }) => {
			const buffer = Buffer.alloc(bufferSize);

			const byteBuffer = new ByteBuffer(buffer);

			byteBuffer.writeInt16LE(dataset);
			assert.equal(byteBuffer.getResultLength(), bufferSize);

			byteBuffer.reset();
			assert.equal(byteBuffer.readInt16LE(), dataset);
			assert.equal(byteBuffer.getResultLength(), bufferSize);
		},
		validValues,
	);

	each(
		"should fail writing value: ",
		({ dataset }) => {
			const buffer = Buffer.alloc(bufferSize);

			const byteBuffer = new ByteBuffer(buffer);

			assert.throws(() => {
				byteBuffer.writeInt16LE(dataset);
			}, `The value of "value" is out of range. It must be >= ${min} and <= ${max}. Received ${dataset}`);
			assert.equal(byteBuffer.getResultLength(), 0);
		},
		invalidValues,
	);
});

describe("UInt16LE", ({ each, assert }) => {
	const bufferSize = 2;
	const min = 0;
	const max = 65535;
	const validValues = [min, max];
	const invalidValues = [min - 1, max + 1];

	each(
		"should write and read value: ",
		({ dataset }) => {
			const buffer = Buffer.alloc(bufferSize);

			const byteBuffer = new ByteBuffer(buffer);

			byteBuffer.writeUInt16LE(dataset);
			assert.equal(byteBuffer.getResultLength(), bufferSize);

			byteBuffer.reset();
			assert.equal(byteBuffer.readUInt16LE(), dataset);
			assert.equal(byteBuffer.getResultLength(), bufferSize);
		},
		validValues,
	);

	each(
		"should fail writing value: ",
		({ dataset }) => {
			const buffer = Buffer.alloc(bufferSize);

			const byteBuffer = new ByteBuffer(buffer);

			assert.throws(() => {
				byteBuffer.writeUInt16LE(dataset);
			}, `The value of "value" is out of range. It must be >= ${min} and <= ${max}. Received ${dataset}`);
			assert.equal(byteBuffer.getResultLength(), 0);
		},
		invalidValues,
	);
});

describe("Int32BE", ({ each, assert }) => {
	const bufferSize = 4;
	const min = -2147483648;
	const max = 2147483647;
	const validValues = [min, max];
	const invalidValues = [min - 1, max + 1];

	each(
		"should write and read value: ",
		({ dataset }) => {
			const buffer = Buffer.alloc(bufferSize);

			const byteBuffer = new ByteBuffer(buffer);

			byteBuffer.writeInt32BE(dataset);
			assert.equal(byteBuffer.getResultLength(), bufferSize);

			byteBuffer.reset();
			assert.equal(byteBuffer.readInt32BE(), dataset);
			assert.equal(byteBuffer.getResultLength(), bufferSize);
		},
		validValues,
	);

	each(
		"should fail writing value: ",
		({ dataset }) => {
			const buffer = Buffer.alloc(bufferSize);

			const byteBuffer = new ByteBuffer(buffer);

			assert.throws(() => {
				byteBuffer.writeInt32BE(dataset);
			}, `The value of "value" is out of range. It must be >= ${min} and <= ${max}. Received ${dataset}`);
			assert.equal(byteBuffer.getResultLength(), 0);
		},
		invalidValues,
	);
});

describe("UInt32BE", ({ each, assert }) => {
	const bufferSize = 4;
	const min = 0;
	const max = 4294967295;
	const validValues = [min, max];
	const invalidValues = [min - 1, max + 1];

	each(
		"should write and read value: ",
		({ dataset }) => {
			const buffer = Buffer.alloc(bufferSize);

			const byteBuffer = new ByteBuffer(buffer);

			byteBuffer.writeUInt32BE(dataset);
			assert.equal(byteBuffer.getResultLength(), bufferSize);

			byteBuffer.reset();
			assert.equal(byteBuffer.readUInt32BE(), dataset);
			assert.equal(byteBuffer.getResultLength(), bufferSize);
		},
		validValues,
	);

	each(
		"should fail writing value: ",
		({ dataset }) => {
			const buffer = Buffer.alloc(bufferSize);

			const byteBuffer = new ByteBuffer(buffer);

			assert.throws(() => {
				byteBuffer.writeUInt32BE(dataset);
			}, `The value of "value" is out of range. It must be >= ${min} and <= ${max}. Received ${dataset}`);
			assert.equal(byteBuffer.getResultLength(), 0);
		},
		invalidValues,
	);
});

describe("Int32LE", ({ each, assert }) => {
	const bufferSize = 4;
	const min = -2147483648;
	const max = 2147483647;
	const validValues = [min, max];
	const invalidValues = [min - 1, max + 1];

	each(
		"should write and read value: ",
		({ dataset }) => {
			const buffer = Buffer.alloc(bufferSize);

			const byteBuffer = new ByteBuffer(buffer);

			byteBuffer.writeInt32LE(dataset);
			assert.equal(byteBuffer.getResultLength(), bufferSize);

			byteBuffer.reset();
			assert.equal(byteBuffer.readInt32LE(), dataset);
			assert.equal(byteBuffer.getResultLength(), bufferSize);
		},
		validValues,
	);

	each(
		"should fail writing value: ",
		({ dataset }) => {
			const buffer = Buffer.alloc(bufferSize);

			const byteBuffer = new ByteBuffer(buffer);

			assert.throws(() => {
				byteBuffer.writeInt32LE(dataset);
			}, `The value of "value" is out of range. It must be >= ${min} and <= ${max}. Received ${dataset}`);
			assert.equal(byteBuffer.getResultLength(), 0);
		},
		invalidValues,
	);
});

describe("UInt32LE", ({ each, assert }) => {
	const bufferSize = 4;
	const min = 0;
	const max = 4294967295;
	const validValues = [min, max];
	const invalidValues = [min - 1, max + 1];

	each(
		"should write and read value: ",
		({ dataset }) => {
			const buffer = Buffer.alloc(bufferSize);

			const byteBuffer = new ByteBuffer(buffer);

			byteBuffer.writeUInt32LE(dataset);
			assert.equal(byteBuffer.getResultLength(), bufferSize);

			byteBuffer.reset();
			assert.equal(byteBuffer.readUInt32LE(), dataset);
			assert.equal(byteBuffer.getResultLength(), bufferSize);
		},
		validValues,
	);

	each(
		"should fail writing value: ",
		({ dataset }) => {
			const buffer = Buffer.alloc(bufferSize);

			const byteBuffer = new ByteBuffer(buffer);

			assert.throws(() => {
				byteBuffer.writeUInt32LE(dataset);
			}, `The value of "value" is out of range. It must be >= ${min} and <= ${max}. Received ${dataset}`);
			assert.equal(byteBuffer.getResultLength(), 0);
		},
		invalidValues,
	);
});

describe("BigInt64BE", ({ each, assert }) => {
	const bufferSize = 8;
	const min = -9223372036854775808n;
	const max = 9223372036854775807n;
	const validValues = [min, max];
	const invalidValues = [min - 1n, max + 1n];

	each(
		"should write and read value: ",
		({ dataset }) => {
			const buffer = Buffer.alloc(bufferSize);

			const byteBuffer = new ByteBuffer(buffer);

			byteBuffer.writeBigInt64BE(dataset);
			assert.equal(byteBuffer.getResultLength(), bufferSize);

			byteBuffer.reset();
			assert.equal(byteBuffer.readBigInt64BE(), dataset);
			assert.equal(byteBuffer.getResultLength(), bufferSize);
		},
		validValues,
	);

	each(
		"should fail writing value: ",
		({ dataset }) => {
			const buffer = Buffer.alloc(bufferSize);

			const byteBuffer = new ByteBuffer(buffer);
			const err = `The value of "value" is out of range. It must be >= -(2n ** 63n) and < 2n ** 63n. Received ${dataset
				.toLocaleString()
				.replace(new RegExp(",", "g"), "_")}n`;

			assert.throws(
				() => {
					byteBuffer.writeBigInt64BE(dataset);
				},
				(e) => e.message === err,
			);
			assert.equal(byteBuffer.getResultLength(), 0);
		},
		invalidValues,
	);
});

describe("BigUInt64BE", ({ each, assert }) => {
	const bufferSize = 8;
	const min = 0n;
	const max = 18_446_744_073_709_551_615n;
	const validValues = [min, max];
	const invalidValues = [min - 1n, max + 1n];

	each(
		"should write and read value: ",
		({ dataset }) => {
			const value: bigint = dataset;
			const buffer = Buffer.alloc(bufferSize);

			const byteBuffer = new ByteBuffer(buffer);

			byteBuffer.writeBigUInt64BE(value);
			assert.equal(byteBuffer.getResultLength(), bufferSize);

			byteBuffer.reset();
			assert.equal(byteBuffer.readBigUInt64BE(), value);
			assert.equal(byteBuffer.getResultLength(), bufferSize);
		},
		validValues,
	);

	each(
		"should fail writing value: ",
		({ dataset }) => {
			const value: bigint = dataset;

			const buffer = Buffer.alloc(bufferSize);

			const byteBuffer = new ByteBuffer(buffer);
			const err = `The value of "value" is out of range. It must be >= 0n and < 2n ** 64n. Received ${value
				.toLocaleString()
				.replace(new RegExp(",", "g"), "_")}n`;

			assert.throws(
				() => {
					byteBuffer.writeBigUInt64BE(value);
				},
				(e) => e.message === err,
			);
			assert.equal(byteBuffer.getResultLength(), 0);
		},
		invalidValues,
	);
});

describe("BigInt64LE", ({ each, assert }) => {
	const bufferSize = 8;
	const min = -9223372036854775808n;
	const max = 9223372036854775807n;
	const validValues = [min, max];
	const invalidValues = [min - 1n, max + 1n];

	each(
		"should write and read value: ",
		({ dataset }) => {
			const buffer = Buffer.alloc(bufferSize);

			const byteBuffer = new ByteBuffer(buffer);

			byteBuffer.writeBigInt64LE(dataset);
			assert.equal(byteBuffer.getResultLength(), bufferSize);

			byteBuffer.reset();
			assert.equal(byteBuffer.readBigInt64LE(), dataset);
			assert.equal(byteBuffer.getResultLength(), bufferSize);
		},
		validValues,
	);

	each(
		"should fail writing value: ",
		({ dataset }) => {
			const buffer = Buffer.alloc(bufferSize);

			const byteBuffer = new ByteBuffer(buffer);
			const err = `The value of "value" is out of range. It must be >= -(2n ** 63n) and < 2n ** 63n. Received ${dataset
				.toLocaleString()
				.replace(new RegExp(",", "g"), "_")}n`;

			assert.throws(
				() => byteBuffer.writeBigInt64BE(dataset),
				(e) => e.message === err,
			);
			assert.equal(byteBuffer.getResultLength(), 0);
		},
		invalidValues,
	);
});

describe("BigUInt64LE", ({ each, assert }) => {
	const bufferSize = 8;
	const min = 0n;
	const max = 18_446_744_073_709_551_615n;
	const validValues = [min, max];
	const invalidValues = [min - 1n, max + 1n];

	each(
		"should write and read value: ",
		({ dataset }) => {
			const buffer = Buffer.alloc(bufferSize);

			const byteBuffer = new ByteBuffer(buffer);

			byteBuffer.writeBigUInt64LE(dataset);
			assert.equal(byteBuffer.getResultLength(), bufferSize);

			byteBuffer.reset();
			assert.equal(byteBuffer.readBigUInt64LE(), dataset);
			assert.equal(byteBuffer.getResultLength(), bufferSize);
		},
		validValues,
	);

	each(
		"should fail writing value: ",
		({ dataset }) => {
			const buffer = Buffer.alloc(bufferSize);

			const byteBuffer = new ByteBuffer(buffer);
			const err = `The value of "value" is out of range. It must be >= 0n and < 2n ** 64n. Received ${dataset
				.toLocaleString()
				.replace(new RegExp(",", "g"), "_")}n`;

			assert.throws(
				() => byteBuffer.writeBigUInt64LE(dataset),
				(e) => e.message === err,
			);
			assert.equal(byteBuffer.getResultLength(), 0);
		},
		invalidValues,
	);
});

describe("buffer", ({ it, assert }) => {
	it("should write and read value", () => {
		const bufferSize = 5;
		const buffer = Buffer.alloc(bufferSize);
		const bufferToCompare = Buffer.alloc(bufferSize).fill(1);

		const byteBuffer = new ByteBuffer(buffer);

		byteBuffer.writeBuffer(bufferToCompare);
		assert.equal(byteBuffer.getResultLength(), bufferSize);

		byteBuffer.reset();
		assert.equal(bufferToCompare.compare(byteBuffer.readBuffer(bufferSize)), 0);
		assert.equal(byteBuffer.getResultLength(), bufferSize);
	});

	it("should throw when writing over boundary", () => {
		const buffer = Buffer.alloc(5);
		const byteBuffer = new ByteBuffer(buffer);

		assert.throws(() => byteBuffer.writeBuffer(Buffer.alloc(6)), "Write over buffer boundary.");
	});

	it("should throw reading writing over boundary", () => {
		const buffer = Buffer.alloc(5);
		const byteBuffer = new ByteBuffer(buffer);

		assert.throws(() => byteBuffer.readBuffer(6), "Read over buffer boundary.");
	});
});
