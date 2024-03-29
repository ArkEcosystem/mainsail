import { dirSync, fileSync, setGracefulCleanup } from "tmp";

import { describe } from "../../../../../test-framework/source";
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

	// TODO: fix
	it.skip("should write and read the given value", async (context) => {
		const file: string = fileSync().name;

		assert.true(await context.fs.put(file, "Hello World"));
		assert.equal(await context.fs.get(file), Buffer.from("Hello World"));
	});

	it("should fail to write the given value", async (context) => {
		assert.false(await context.fs.put(undefined, "Hello World"));
	});

	// TODO: fix
	it.skip("should delete the given file", async (context) => {
		const file: string = fileSync().name;

		assert.true(await context.fs.exists(file));

		assert.true(await context.fs.delete(file));

		assert.false(await context.fs.exists(file));
	});

	it("should fail to delete the given file", async (context) => {
		assert.false(await context.fs.delete());
	});

	// TODO: fix
	it.skip("should copy the given file", async (context) => {
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

	// TODO: fix
	it.skip("should move the given file", async (context) => {
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

	// TODO: fix
	it.skip("should return the size of the given file", async (context) => {
		const file: string = fileSync().name;

		await context.fs.put(file, "Hello World");

		assert.is(await context.fs.size(file), 11);
	});

	// TODO: fix
	it.skip("should return the last time the file was modified", async (context) => {
		const file: string = fileSync().name;

		await context.fs.put(file, "Hello World");

		assert.number(await context.fs.lastModified(file));
	});

	// TODO: fix
	it.skip(".files", async (context) => {
		const dir: string = dirSync().name;
		const file = `${dir}/files.txt`;

		await context.fs.put(file, "Hello World");

		assert.equal(await context.fs.files(dir), [file]);
	});

	// TODO: fix
	it.skip(".directories", async (context) => {
		const dir: string = dirSync().name;
		const subdir = `${dir}/sub`;

		await context.fs.makeDirectory(subdir);

		assert.equal(await context.fs.directories(dir), [subdir]);
	});

	// TODO: fix
	it.skip("should create the given directory", async (context) => {
		const dir = `${dirSync().name}/sub`;

		assert.false(await context.fs.exists(dir));

		assert.true(await context.fs.makeDirectory(dir));

		assert.true(await context.fs.exists(dir));
	});

	it("should fail to create the given directory", async (context) => {
		assert.false(await context.fs.makeDirectory());
	});

	// TODO: fix
	it.skip("should delete the given directory", async (context) => {
		const dir: string = dirSync().name;

		assert.true(await context.fs.exists(dir));

		assert.true(await context.fs.deleteDirectory(dir));

		assert.false(await context.fs.exists(dir));
	});

	it("should fail to delete the given directory", async (context) => {
		assert.false(await context.fs.deleteDirectory());
	});
});
