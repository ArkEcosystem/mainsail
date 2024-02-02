import { describe } from "../../test-framework";
import { ByteBuffer } from "@mainsail/utils";
import { BIP38 } from "./bip38";
import fixtures from "../test/fixtures/bip38.json";
import wif from "wif";
import { Exceptions } from "@mainsail/contracts";

describe("BIP38", ({ assert, beforeEach, it, stub }) => {
    let bip38 = new BIP38();

    beforeEach(() => {
        bip38 = new BIP38();
    });

    describe("decypt", () => {
        for (const fixture of fixtures.valid) {
            it(`should decrypt '${fixture.description}'`, () => {
                const result = bip38.decrypt(fixture.bip38, fixture.passphrase);
                assert.equal(wif.encode(0x80, result.privateKey, result.compressed), fixture.wif);
            });
        }

        for (const fixture of fixtures.invalid.verify) {
            it(`should not decrypt '${fixture.description}'`, () => {
                try {
                    bip38.decrypt(fixture.base58, "foobar");
                } catch (error) {
                    assert.equal(error.name, fixture.error.type);
                    assert.equal(error.message, fixture.error.message);
                }
            });
        }

        it("should throw if compression flag is different than 0xe0 0xc0", () => {
            const byteBuffer = ByteBuffer.fromSize(512);
            byteBuffer.writeUint8(0x01);
            byteBuffer.writeUint8(0x42); // type
            byteBuffer.writeUint8(0x01); // flag

            const buffer: any = Buffer.from(byteBuffer.toBuffer());
            // force length to be 39
            Object.defineProperty(buffer, "length", {
                get: () => 39,
                set: () => { },
            });

            stub(bip38, "decodeCheck").returnValue(buffer);
            assert.throws(() => bip38.decrypt("", ""), new Exceptions.Bip38CompressionError(192, 1).message);
        });
    });

    describe("encrypt", () => {
        for (const fixture of fixtures.valid) {
            if (fixture.decryptOnly) {
                continue;
            }

            it(`should encrypt '${fixture.description}'`, () => {
                const buffer = bip38.decodeCheck(fixture.wif);
                const actual = bip38.encrypt(buffer.subarray(1, 33), !!buffer[33], fixture.passphrase);
                assert.equal(actual, fixture.bip38);
            });
        }

        it("should throw if private key buffer length is different than 32", () => {
            const byteBuffer = ByteBuffer.fromSize(512);
            byteBuffer.writeUint8(0x01);
            const buffer = Buffer.from(byteBuffer.toBuffer());
            assert.throws(() => bip38.encrypt(buffer, true, ""), new Exceptions.PrivateKeyLengthError(32, 512).message);
        });
    });


    describe("verify", () => {
        for (const fixture of fixtures.valid) {
            it(`should verify '${fixture.bip38}'`, () => {
                assert.true(bip38.verify(fixture.bip38));
            });
        }

        for (const fixture of fixtures.invalid.verify) {
            it(`should not verify '${fixture.description}'`, () => {
                assert.false(bip38.verify(fixture.base58));
            });
        }

        it("should return false if encrypted WIF flag is different than 0xc0 0xe0", () => {
            const byteBuffer = ByteBuffer.fromSize(512);
            byteBuffer.writeUint8(0x01);
            byteBuffer.writeUint8(0x42); // type
            byteBuffer.writeUint8(0x01); // flag

            const buffer: any = Buffer.from(byteBuffer.toBuffer());
            // force length to be 39
            Object.defineProperty(buffer, "length", {
                get: () => 39,
                set: () => { },
            });

            assert.false(bip38.verify("yo"));
        });

        it("should return false if encrypted EC mult flag is different than 0x24", () => {
            const byteBuffer = ByteBuffer.fromSize(512);
            byteBuffer.writeUint8(0x01);
            byteBuffer.writeUint8(0x43); // type
            byteBuffer.writeUint8(0x01); // flag

            const buffer: any = Buffer.from(byteBuffer.toBuffer());
            // force length to be 39
            Object.defineProperty(buffer, "length", {
                get: () => 43,
                set: () => { },
            });

            assert.false(bip38.verify("yo"));
        });
    });
});
