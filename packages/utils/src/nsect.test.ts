import "jest-extended";

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
	for (let i = indexesToProbe.length - 1; i >= 0; i--) {
		const indexToProbe: number = indexesToProbe[i];

		if (searchCondition(data[indexToProbe])) {
			return indexToProbe;
		}
	}

	return undefined;
};

beforeAll(() => {
	data = [];
	for (let i = 0; i < 1000; i++) {
		data[i] = i * 10;
	}
});

describe("N-section (binary search)", () => {
	nAry = 2;

	const nSect = new NSect(nAry, probe);

	it("arbitrary", async () => {
		numberOfProbeCalls = 0;
	});
	it("lucky case", async () => {
		numberOfProbeCalls = 0;
		searchCondition = (element: number) => element <= 5000;

		const index: any = await nSect.find(0, data.length - 1);

		expect(data[index]).toBe(5000);
		expect(numberOfProbeCalls).toBe(2);
	});

	it("worst case", async () => {
		numberOfProbeCalls = 0;
		searchCondition = (element: number) => element <= 3560;

		const index: any = await nSect.find(0, data.length - 1);

		expect(data[index]).toBe(3560);
		expect(numberOfProbeCalls).toBe(9);
	});

	it("search in a sub-range", async () => {
		numberOfProbeCalls = 0;
		searchCondition = (element: number) => element <= 4000;

		const index: any = await nSect.find(350, 500);

		expect(data[index]).toBe(4000);
		expect(numberOfProbeCalls).toBe(6);
	});

	it("nonexistent", async () => {
		numberOfProbeCalls = 0;
		searchCondition = () => false;

		expect(await nSect.find(0, data.length - 1)).toBeUndefined();
		expect(numberOfProbeCalls).toBe(1);
	});

	it("biggest one", async () => {
		numberOfProbeCalls = 0;
		searchCondition = () => true;

		const index: any = await nSect.find(0, data.length - 1);

		expect(data[index]).toBe(9990);
		expect(numberOfProbeCalls).toBe(1);
	});
});

describe("N-section (8-ary search)", () => {
	nAry = 8;

	const nSect = new NSect(nAry, probe);

	it("arbitrary", async () => {
		numberOfProbeCalls = 0;
		searchCondition = (element: number) => element <= 5678;

		const index: any = await nSect.find(0, data.length - 1);

		expect(data[index]).toBe(5670);
		expect(numberOfProbeCalls).toBe(4);
	});

	it("lucky case", async () => {
		numberOfProbeCalls = 0;
		searchCondition = (element: number) => element <= 5000;

		const index: any = await nSect.find(0, data.length - 1);

		expect(data[index]).toBe(5000);
		expect(numberOfProbeCalls).toBe(2);
	});

	it("worst case", async () => {
		numberOfProbeCalls = 0;
		searchCondition = (element: number) => element <= 3560;

		const index: any = await nSect.find(0, data.length - 1);

		expect(data[index]).toBe(3560);
		expect(numberOfProbeCalls).toBe(4);
	});

	it("search in a sub-range", async () => {
		numberOfProbeCalls = 0;
		searchCondition = (element: number) => element <= 4000;

		const index: any = await nSect.find(350, 500);

		expect(data[index]).toBe(4000);
		expect(numberOfProbeCalls).toBe(3);
	});

	it("search in a narrow range", async () => {
		numberOfProbeCalls = 0;
		searchCondition = (element: number) => element <= 4000;

		const index: any = await nSect.find(398, 402);

		expect(data[index]).toBe(4000);
		expect(numberOfProbeCalls).toBe(1);
	});

	it("search in a range with length 9", async () => {
		numberOfProbeCalls = 0;
		searchCondition = (element: number) => element <= 4000;

		const index: any = await nSect.find(398, 407);

		expect(data[index]).toBe(4000);
		expect(numberOfProbeCalls).toBe(1);
	});

	it("nonexistent", async () => {
		numberOfProbeCalls = 0;
		searchCondition = () => false;
		expect(await nSect.find(0, data.length - 1)).toBeUndefined();
		expect(numberOfProbeCalls).toBe(1);
	});

	it("biggest one", async () => {
		numberOfProbeCalls = 0;
		searchCondition = () => true;

		const index: any = await nSect.find(0, data.length - 1);

		expect(data[index]).toBe(9990);
		expect(numberOfProbeCalls).toBe(1);
	});
});
