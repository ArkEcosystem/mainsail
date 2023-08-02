export class ByteBuffer {
	#buffer: Buffer;
	#offset = 0;
	#marker = 0;

	private constructor(buffer: Buffer) {
		this.#buffer = buffer;
	}

	public static fromSize(size: number) {
		return new ByteBuffer(Buffer.alloc(size));
	}

	public static fromBuffer(buffer: Buffer) {
		return new ByteBuffer(buffer);
	}

	public writeUint8(value: number): void {
		this.#offset = this.#buffer.writeUInt8(value, this.#offset);
	}

	public readUint8(): number {
		const value = this.#buffer.readUInt8(this.#offset);
		this.#offset += 1;
		return value;
	}

	public writeUint16(value: number): void {
		this.#offset = this.#buffer.writeUInt16LE(value, this.#offset);
	}

	public readUint16(): number {
		const value = this.#buffer.readUInt16LE(this.#offset);
		this.#offset += 2;
		return value;
	}

	public writeUint32(value: number): void {
		this.#offset = this.#buffer.writeUInt32LE(value, this.#offset);
	}

	public readUint32(): number {
		const value = this.#buffer.readUInt32LE(this.#offset);
		this.#offset += 4;
		return value;
	}

	public writeUint48(value: number): void {
		if (value < 0 || value > 2 ** 48 - 1) {
			throw new Error(
				`The value of "value" is out of range. It must be >= 0 and <= ${2 ** 48 - 1}. Received ${value}`,
			);
		}

		this.#offset = this.#buffer.writeUIntLE(value, this.#offset, 6);
	}

	public readUint48(): number {
		const value = this.#buffer.readUIntLE(this.#offset, 6);
		this.#offset += 6;
		return value;
	}

	public writeUint64(value: bigint): void {
		if (typeof value !== "bigint") {
			value = BigInt(value);
		}

		this.#offset = this.#buffer.writeBigUInt64LE(value, this.#offset);
	}

	public readUint64(): bigint {
		const value = this.#buffer.readBigUInt64LE(this.#offset);
		this.#offset += 8;
		return value;
	}

	public writeBytes(value: Buffer): void {
		if (value.length > this.getRemainderLength()) {
			throw new Error(
				"Write over buffer boundary. (length: " +
					value.length +
					", remaining: " +
					this.getRemainderLength() +
					", diff: " +
					(value.length - this.getRemainderLength()) +
					")",
			);
		}

		this.#offset += value.copy(this.#buffer, this.#offset);
	}

	public readBytes(length: number): Buffer {
		if (length > this.getRemainderLength()) {
			throw new Error(
				"Read over buffer boundary. (length: " +
					length +
					", remaining: " +
					this.getRemainderLength() +
					", diff: " +
					(length - this.getRemainderLength()) +
					")",
			);
		}

		const value = this.#buffer.subarray(this.#offset, this.#offset + length);
		this.#offset += length;
		return value;
	}

	public readHex(length: number): Buffer {
		return this.readBytes(length);
	}

	public getRemainder(): Buffer {
		return this.#buffer.subarray(this.#offset);
	}

	public getRemainderLength(): number {
		return this.#buffer.length - this.#offset;
	}

	public getResult(): Buffer {
		return this.#buffer.subarray(0, this.#offset);
	}

	public getResultLength(): number {
		return this.#offset;
	}

	public mark(): void {
		this.#marker = this.#offset;
	}

	public reset(): void {
		this.#offset = this.#marker ?? 0;
	}

	public skip(length: number): void {
		if (length < -this.#offset || length > this.getRemainderLength()) {
			throw new Error("Jump over buffer boundary.");
		}

		this.#offset += length;
	}

	public toBuffer(): Buffer {
		return Buffer.from(this.#buffer.buffer);
	}
}
