import { dirSync, fileSync, setGracefulCleanup } from "tmp";

import { describe } from "../../../../../core-test-framework";
import { LocalFilesystem } from "./local";

describe<{
	fs: LocalFilesystem;
}>("LocalFilesystem", ({ afterEach, beforeEach, assert, it }) => {
	beforeEach((context) => {
		context.fs = new LocalFilesystem();
	});

	afterEach(() => setGracefulCleanup());

	it("should make an instance of the filesystem", async (context) => {
		assert.instance(await context.fs.make(), LocalFilesystem);
	});

	it("should write and read the given value", async (context) => {
		const file: string = fileSync().name;

		assert.true(await context.fs.put(file, "Hello World"));
		assert.equal(await context.fs.get(file), Buffer.from("Hello World"));
	});

	it("should fail to write the given value", async (context) => {
		assert.false(await context.fs.put(undefined, "Hello World"));
	});

	it("should delete the given file", async (context) => {
		const file: string = fileSync().name;

		assert.true(await context.fs.exists(file));

		assert.true(await context.fs.delete(file));

		assert.false(await context.fs.exists(file));
	});

	it("should fail to delete the given file", async (context) => {
		assert.false(await context.fs.delete());
	});

	it("should copy the given file", async (context) => {
		const fileSource: string = fileSync().name;
		const fileDestination = `${fileSource}.copy`;

		assert.true(await context.fs.exists(fileSource));
		assert.false(await context.fs.exists(fileDestination));

		assert.true(await context.fs.copy(fileSource, fileDestination));

		assert.true(await context.fs.exists(fileSource));
		assert.true(await context.fs.exists(fileDestination));
	});

	it("should fail to copy the given file", async (context) => {
		assert.false(await context.fs.copy());
	});

	it("should move the given file", async (context) => {
		const fileSource: string = fileSync().name;
		const fileDestination = `${fileSource}.move`;

		assert.true(await context.fs.exists(fileSource));
		assert.false(await context.fs.exists(fileDestination));

		assert.true(await context.fs.move(fileSource, fileDestination));

		assert.false(await context.fs.exists(fileSource));
		assert.true(await context.fs.exists(fileDestination));
	});

	it("should fail to move the given file", async (context) => {
		assert.false(await context.fs.move());
	});

	it("should return the size of the given file", async (context) => {
		const file: string = fileSync().name;

		await context.fs.put(file, "Hello World");

		assert.is(await context.fs.size(file), 11);
	});

	it("should return the last time the file was modified", async (context) => {
		const file: string = fileSync().name;

		await context.fs.put(file, "Hello World");

		assert.number(await context.fs.lastModified(file));
	});

	it(".files", async (context) => {
		const dir: string = dirSync().name;
		const file = `${dir}/files.txt`;

		await context.fs.put(file, "Hello World");

		assert.equal(await context.fs.files(dir), [file]);
	});

	it(".directories", async (context) => {
		const dir: string = dirSync().name;
		const subdir = `${dir}/sub`;

		await context.fs.makeDirectory(subdir);

		assert.equal(await context.fs.directories(dir), [subdir]);
	});

	it("should create the given directory", async (context) => {
		const dir = `${dirSync().name}/sub`;

		assert.false(await context.fs.exists(dir));

		assert.true(await context.fs.makeDirectory(dir));

		assert.true(await context.fs.exists(dir));
	});

	it("should fail to create the given directory", async (context) => {
		assert.false(await context.fs.makeDirectory());
	});

	it("should delete the given directory", async (context) => {
		const dir: string = dirSync().name;

		assert.true(await context.fs.exists(dir));

		assert.true(await context.fs.deleteDirectory(dir));

		assert.false(await context.fs.exists(dir));
	});

	it("should fail to delete the given directory", async (context) => {
		assert.false(await context.fs.deleteDirectory());
	});
});
