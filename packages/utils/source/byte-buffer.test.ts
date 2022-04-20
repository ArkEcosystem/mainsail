import { Buffer } from "buffer";

import { describe } from "../../core-test-framework";
import { ByteBuffer } from "./byte-buffer";

describe("ByteBuffer", ({ it, assert }) => {
	it("result - should return valid result & result length", () => {
		const buffer = Buffer.alloc(2);
		const byteBuffer = ByteBuffer.fromBuffer(buffer);

		assert.equal(byteBuffer.getResultLength(), 0);
		assert.equal(Buffer.alloc(0).compare(byteBuffer.getResult()), 0);

		byteBuffer.writeUint8(1);

		assert.equal(byteBuffer.getResultLength(), 1);
		const temporaryBuffer1 = Buffer.alloc(1);
		temporaryBuffer1.writeInt8(1);
		assert.equal(temporaryBuffer1.compare(byteBuffer.getResult()), 0);

		byteBuffer.writeUint8(2);

		assert.equal(byteBuffer.getResultLength(), 2);
		const temporaryBuffer2 = Buffer.alloc(2);
		temporaryBuffer2.writeInt8(1);
		temporaryBuffer2.writeInt8(2, 1);
		assert.equal(temporaryBuffer2.compare(byteBuffer.getResult()), 0);
	});

	it("reminder - should return valid remainders and remainder length", () => {
		const buffer = Buffer.alloc(2);
		const byteBuffer = ByteBuffer.fromBuffer(buffer);

		byteBuffer.writeUint8(1);
		byteBuffer.writeUint8(2);
		byteBuffer.reset();

		assert.equal(byteBuffer.getRemainderLength(), 2);
		const temporaryBuffer1 = Buffer.alloc(2);
		temporaryBuffer1.writeInt8(1);
		temporaryBuffer1.writeInt8(2, 1);
		assert.equal(temporaryBuffer1.compare(byteBuffer.getRemainder()), 0);

		byteBuffer.readUint8();

		assert.equal(byteBuffer.getRemainderLength(), 1);
		const temporaryBuffer2 = Buffer.alloc(1);
		temporaryBuffer2.writeInt8(2);
		assert.equal(temporaryBuffer2.compare(byteBuffer.getRemainder()), 0);

		byteBuffer.readUint8();

		assert.equal(byteBuffer.getRemainderLength(), 0);
		assert.equal(Buffer.alloc(0).compare(byteBuffer.getRemainder()), 0);
	});

	it("jump - should jump", () => {
		const buffer = Buffer.alloc(1);
		const byteBuffer = ByteBuffer.fromBuffer(buffer);

		assert.equal(byteBuffer.getResultLength(), 0);

		byteBuffer.skip(1);
		assert.equal(byteBuffer.getResultLength(), 1);

		byteBuffer.skip(-1);
		assert.equal(byteBuffer.getResultLength(), 0);
	});

	it("jump - should throw error when jumping outside boundary", () => {
		const buffer = Buffer.alloc(1);
		const byteBuffer = ByteBuffer.fromBuffer(buffer);

		assert.throws(() => byteBuffer.skip(2), "Jump over buffer boundary.");

		assert.throws(() => byteBuffer.skip(-1), "Jump over buffer boundary.");
	});
});

describe("writeUint8", ({ each, assert }) => {
	const bufferSize = 1;
	const min = 0;
	const max = 255;
	const validValues = [min, max];
	const invalidValues = [min - 1, max + 1];

	each(
		"should write and read value: ",
		({ dataset }) => {
			const buffer = Buffer.alloc(bufferSize);

			const byteBuffer = ByteBuffer.fromBuffer(buffer);

			byteBuffer.writeUint8(dataset);
			assert.equal(byteBuffer.getResultLength(), bufferSize);

			byteBuffer.reset();
			assert.equal(byteBuffer.readUint8(), dataset);
			assert.equal(byteBuffer.getResultLength(), bufferSize);
		},
		validValues,
	);

	each(
		"should fail writing value: ",
		({ dataset }) => {
			const buffer = Buffer.alloc(bufferSize);

			const byteBuffer = ByteBuffer.fromBuffer(buffer);

			assert.throws(() => {
				byteBuffer.writeUint8(dataset);
			}, `The value of "value" is out of range. It must be >= ${min} and <= ${max}. Received ${dataset}`);

			assert.equal(byteBuffer.getResultLength(), 0);
		},
		invalidValues,
	);
});

describe("writeUint16", ({ each, assert }) => {
	const bufferSize = 2;
	const min = 0;
	const max = 65_535;
	const validValues = [min, max];
	const invalidValues = [min - 1, max + 1];

	each(
		"should write and read value: ",
		({ dataset }) => {
			const buffer = Buffer.alloc(bufferSize);

			const byteBuffer = ByteBuffer.fromBuffer(buffer);

			byteBuffer.writeUint16(dataset);
			assert.equal(byteBuffer.getResultLength(), bufferSize);

			byteBuffer.reset();
			assert.equal(byteBuffer.readUint16(), dataset);
			assert.equal(byteBuffer.getResultLength(), bufferSize);
		},
		validValues,
	);

	each(
		"should fail writing value: ",
		({ dataset }) => {
			const buffer = Buffer.alloc(bufferSize);

			const byteBuffer = ByteBuffer.fromBuffer(buffer);

			assert.throws(() => {
				byteBuffer.writeUint16(dataset);
			}, `The value of "value" is out of range. It must be >= ${min} and <= ${max}. Received ${dataset}`);
			assert.equal(byteBuffer.getResultLength(), 0);
		},
		invalidValues,
	);
});

describe("writeUint32", ({ each, assert }) => {
	const bufferSize = 4;
	const min = 0;
	const max = 4_294_967_295;
	const validValues = [min, max];
	const invalidValues = [min - 1, max + 1];

	each(
		"should write and read value: ",
		({ dataset }) => {
			const buffer = Buffer.alloc(bufferSize);

			const byteBuffer = ByteBuffer.fromBuffer(buffer);

			byteBuffer.writeUint32(dataset);
			assert.equal(byteBuffer.getResultLength(), bufferSize);

			byteBuffer.reset();
			assert.equal(byteBuffer.readUint32(), dataset);
			assert.equal(byteBuffer.getResultLength(), bufferSize);
		},
		validValues,
	);

	each(
		"should fail writing value: ",
		({ dataset }) => {
			const buffer = Buffer.alloc(bufferSize);

			const byteBuffer = ByteBuffer.fromBuffer(buffer);

			assert.throws(() => {
				byteBuffer.writeUint32(dataset);
			}, `The value of "value" is out of range. It must be >= ${min} and <= ${max}. Received ${dataset}`);
			assert.equal(byteBuffer.getResultLength(), 0);
		},
		invalidValues,
	);
});

describe("writeUint64", ({ each, assert }) => {
	const bufferSize = 8;
	const min = 0n;
	const max = 18_446_744_073_709_551_615n;
	const validValues = [min, max];
	const invalidValues = [min - 1n, max + 1n];

	each(
		"should write and read value: ",
		({ dataset }) => {
			const buffer = Buffer.alloc(bufferSize);

			const byteBuffer = ByteBuffer.fromBuffer(buffer);

			byteBuffer.writeUint64(dataset);
			assert.equal(byteBuffer.getResultLength(), bufferSize);

			byteBuffer.reset();
			assert.equal(byteBuffer.readUint64(), dataset);
			assert.equal(byteBuffer.getResultLength(), bufferSize);
		},
		validValues,
	);

	each(
		"should fail writing value: ",
		({ dataset }) => {
			const buffer = Buffer.alloc(bufferSize);

			const byteBuffer = ByteBuffer.fromBuffer(buffer);
			const error = `The value of "value" is out of range. It must be >= 0n and < 2n ** 64n. Received ${dataset
				.toLocaleString()
				.replace(new RegExp(",", "g"), "_")}n`;

			assert.throws(
				() => byteBuffer.writeUint64(dataset),
				(e) => e.message === error,
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

		const byteBuffer = ByteBuffer.fromBuffer(buffer);

		byteBuffer.writeBytes(bufferToCompare);
		assert.equal(byteBuffer.getResultLength(), bufferSize);

		byteBuffer.reset();
		assert.equal(bufferToCompare.compare(byteBuffer.readBytes(bufferSize)), 0);
		assert.equal(byteBuffer.getResultLength(), bufferSize);
	});

	it("should throw when writing over boundary", () => {
		const buffer = Buffer.alloc(5);
		const byteBuffer = ByteBuffer.fromBuffer(buffer);

		assert.throws(() => byteBuffer.writeBytes(Buffer.alloc(6)), "Write over buffer boundary.");
	});

	it("should throw reading writing over boundary", () => {
		const buffer = Buffer.alloc(5);
		const byteBuffer = ByteBuffer.fromBuffer(buffer);

		assert.throws(() => byteBuffer.readBytes(6), "Read over buffer boundary.");
	});
});
