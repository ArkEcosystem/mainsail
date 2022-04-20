import { describe } from "../../core-test-framework";
import { NSect } from "./nsect";

let data: number[];
let nAry: number;
let numberOfProbeCalls: number;
let searchCondition: (element: number) => boolean;

const probe = async (indexesToProbe: number[]): Promise<number | undefined> => {
	numberOfProbeCalls++;

	// We must return the biggest index whose element satisfies the condition. So we probe
	// from the biggest to the smallest and the first one that satisfies the condition is
	// the one we report.
	for (let index = indexesToProbe.length - 1; index >= 0; index--) {
		const indexToProbe: number = indexesToProbe[index];

		if (searchCondition(data[indexToProbe])) {
			return indexToProbe;
		}
	}

	return undefined;
};

describe("N-section (binary search)", ({ it, assert, beforeAll }) => {
	beforeAll(() => {
		data = [];
		for (let index = 0; index < 1000; index++) {
			data[index] = index * 10;
		}
	});

	nAry = 2;
	const nSect = new NSect(nAry, probe);

	it("arbitrary", async () => {
		numberOfProbeCalls = 0;
	});

	it("lucky case", async () => {
		numberOfProbeCalls = 0;
		searchCondition = (element: number) => element <= 5000;

		const index: any = await nSect.find(0, data.length - 1);

		assert.equal(data[index], 5000);
		assert.equal(numberOfProbeCalls, 2);
	});

	it("worst case", async () => {
		numberOfProbeCalls = 0;
		searchCondition = (element: number) => element <= 3560;

		const index: any = await nSect.find(0, data.length - 1);

		assert.equal(data[index], 3560);
		assert.equal(numberOfProbeCalls, 9);
	});

	it("search in a sub-range", async () => {
		numberOfProbeCalls = 0;
		searchCondition = (element: number) => element <= 4000;

		const index: any = await nSect.find(350, 500);

		assert.equal(data[index], 4000);
		assert.equal(numberOfProbeCalls, 6);
	});

	it("nonexistent", async () => {
		numberOfProbeCalls = 0;
		searchCondition = () => false;

		assert.undefined(await nSect.find(0, data.length - 1));
		assert.equal(numberOfProbeCalls, 1);
	});

	it("biggest one", async () => {
		numberOfProbeCalls = 0;
		searchCondition = () => true;

		const index: any = await nSect.find(0, data.length - 1);

		assert.equal(data[index], 9990);
		assert.equal(numberOfProbeCalls, 1);
	});
});

describe("N-section (8-ary search)", ({ it, assert }) => {
	nAry = 8;

	const nSect = new NSect(nAry, probe);

	it("arbitrary", async () => {
		numberOfProbeCalls = 0;
		searchCondition = (element: number) => element <= 5678;

		const index: any = await nSect.find(0, data.length - 1);

		assert.equal(data[index], 5670);
		assert.equal(numberOfProbeCalls, 4);
	});

	it("lucky case", async () => {
		numberOfProbeCalls = 0;
		searchCondition = (element: number) => element <= 5000;

		const index: any = await nSect.find(0, data.length - 1);

		assert.equal(data[index], 5000);
		assert.equal(numberOfProbeCalls, 2);
	});

	it("worst case", async () => {
		numberOfProbeCalls = 0;
		searchCondition = (element: number) => element <= 3560;

		const index: any = await nSect.find(0, data.length - 1);

		assert.equal(data[index], 3560);
		assert.equal(numberOfProbeCalls, 4);
	});

	it("search in a sub-range", async () => {
		numberOfProbeCalls = 0;
		searchCondition = (element: number) => element <= 4000;

		const index: any = await nSect.find(350, 500);

		assert.equal(data[index], 4000);
		assert.equal(numberOfProbeCalls, 3);
	});

	it("search in a narrow range", async () => {
		numberOfProbeCalls = 0;
		searchCondition = (element: number) => element <= 4000;

		const index: any = await nSect.find(398, 402);

		assert.equal(data[index], 4000);
		assert.equal(numberOfProbeCalls, 1);
	});

	it("search in a range with length 9", async () => {
		numberOfProbeCalls = 0;
		searchCondition = (element: number) => element <= 4000;

		const index: any = await nSect.find(398, 407);

		assert.equal(data[index], 4000);
		assert.equal(numberOfProbeCalls, 1);
	});

	it("nonexistent", async () => {
		numberOfProbeCalls = 0;
		searchCondition = () => false;
		assert.undefined(await nSect.find(0, data.length - 1));
		assert.equal(numberOfProbeCalls, 1);
	});

	it("biggest one", async () => {
		numberOfProbeCalls = 0;
		searchCondition = () => true;

		const index: any = await nSect.find(0, data.length - 1);

		assert.equal(data[index], 9990);
		assert.equal(numberOfProbeCalls, 1);
	});
});
