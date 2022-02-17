import "jest-extended";

import { semver } from "./semver";

describe("#semver", () => {
	describe("#isEqual", () => {
		it("should return true", () => {
			expect(semver.isEqual("0.0.0", "0.0.0")).toBeTrue();
			expect(semver.isEqual("1.2.3", "1.2.3")).toBeTrue();

			expect(semver.isEqual("0.0", "0.0")).toBeTrue();
			expect(semver.isEqual("1.2", "1.2")).toBeTrue();

			expect(semver.isEqual("0", "0")).toBeTrue();
			expect(semver.isEqual("1", "1")).toBeTrue();
		});

		it("should return false", () => {
			expect(semver.isEqual("0.0.0", "0.0.1")).toBeFalse();
			expect(semver.isEqual("1.2.3", "1.2.4")).toBeFalse();

			expect(semver.isEqual("0.1", "0.0")).toBeFalse();
			expect(semver.isEqual("1.2", "1.3")).toBeFalse();

			expect(semver.isEqual("0", "1")).toBeFalse();
			expect(semver.isEqual("1", "2")).toBeFalse();
		});
	});

	describe("#isGreaterThan", () => {
		it("should return true", () => {
			expect(semver.isGreaterThan("2.1.0", "1.9.0")).toBeTrue();
			expect(semver.isGreaterThan("1.9.1", "1.9.0")).toBeTrue();
			expect(semver.isGreaterThan("10.0.0", "1.0.0")).toBeTrue();
			expect(semver.isGreaterThan("10.0.0", "8.9.0")).toBeTrue();
			expect(semver.isGreaterThan("1.2.3-next.10", "1.2.3-next.6")).toBeTrue();
			expect(semver.isGreaterThan("2.0.0-alpha-10", "2.0.0-alpha-6")).toBeTrue();
			expect(semver.isGreaterThan("2.0.0-beta.1", "2.0.0-alpha.8")).toBeTrue();
		});

		it("should return false", () => {
			expect(semver.isGreaterThan("1.9.0", "2.1.0")).toBeFalse();
			expect(semver.isGreaterThan("1.9.0", "1.9.1")).toBeFalse();
			expect(semver.isGreaterThan("1.0.0", "10.0.0")).toBeFalse();
			expect(semver.isGreaterThan("8.9.0", "10.0.0")).toBeFalse();
			expect(semver.isGreaterThan("1.2.3-next.6", "1.2.3-next.10")).toBeFalse();
			expect(semver.isGreaterThan("2.0.0-alpha-6", "2.0.0-alpha-10")).toBeFalse();
			expect(semver.isGreaterThan("2.0.0-alpha.8", "2.0.0-beta.1")).toBeFalse();
		});
	});

	describe("#isGreaterThanOrEqual", () => {
		it("should return true", () => {
			expect(semver.isGreaterThanOrEqual("0.0.0", "0.0.0")).toBeTrue();
			expect(semver.isGreaterThanOrEqual("1.2.3", "1.2.3")).toBeTrue();
			expect(semver.isGreaterThanOrEqual("2.1.0", "1.9.0")).toBeTrue();
			expect(semver.isGreaterThanOrEqual("1.9.1", "1.9.0")).toBeTrue();
			expect(semver.isGreaterThanOrEqual("10.0.0", "1.0.0")).toBeTrue();
			expect(semver.isGreaterThanOrEqual("10.0.0", "8.9.0")).toBeTrue();
			expect(semver.isGreaterThanOrEqual("1.2.3-next.10", "1.2.3-next.6")).toBeTrue();
			expect(semver.isGreaterThanOrEqual("2.0.0-alpha-10", "2.0.0-alpha-6")).toBeTrue();
			expect(semver.isGreaterThanOrEqual("2.0.0-beta.1", "2.0.0-alpha.8")).toBeTrue();
		});

		it("should return false", () => {
			expect(semver.isGreaterThanOrEqual("1.9.0", "2.1.0")).toBeFalse();
			expect(semver.isGreaterThanOrEqual("1.9.0", "1.9.1")).toBeFalse();
			expect(semver.isGreaterThanOrEqual("1.0.0", "10.0.0")).toBeFalse();
			expect(semver.isGreaterThanOrEqual("8.9.0", "10.0.0")).toBeFalse();
			expect(semver.isGreaterThanOrEqual("1.2.3-next.6", "1.2.3-next.10")).toBeFalse();
			expect(semver.isGreaterThanOrEqual("2.0.0-alpha-6", "2.0.0-alpha-10")).toBeFalse();
			expect(semver.isGreaterThanOrEqual("2.0.0-alpha.8", "2.0.0-beta.1")).toBeFalse();
		});
	});

	describe("#isLessThan", () => {
		it("should return true", () => {
			expect(semver.isLessThan("1.9.0", "2.1.0")).toBeTrue();
			expect(semver.isLessThan("1.9.0", "1.9.1")).toBeTrue();
			expect(semver.isLessThan("1.0.0", "10.0.0")).toBeTrue();
			expect(semver.isLessThan("8.9.0", "10.0.0")).toBeTrue();
			expect(semver.isLessThan("1.2.3-next.6", "1.2.3-next.10")).toBeTrue();
			expect(semver.isLessThan("2.0.0-alpha-6", "2.0.0-alpha-10")).toBeTrue();
			expect(semver.isLessThan("2.0.0-alpha.8", "2.0.0-beta.1")).toBeTrue();
		});

		it("should return false", () => {
			expect(semver.isLessThan("2.1.0", "1.9.0")).toBeFalse();
			expect(semver.isLessThan("1.9.1", "1.9.0")).toBeFalse();
			expect(semver.isLessThan("10.0.0", "1.0.0")).toBeFalse();
			expect(semver.isLessThan("10.0.0", "8.9.0")).toBeFalse();
			expect(semver.isLessThan("1.2.3-next.10", "1.2.3-next.6")).toBeFalse();
			expect(semver.isLessThan("2.0.0-alpha-10", "2.0.0-alpha-6")).toBeFalse();
			expect(semver.isLessThan("2.0.0-beta.1", "2.0.0-alpha.8")).toBeFalse();
		});
	});

	describe("#isLessThanOrEqual", () => {
		it("should return true", () => {
			expect(semver.isLessThanOrEqual("0.0.0", "0.0.0")).toBeTrue();
			expect(semver.isLessThanOrEqual("1.2.3", "1.2.3")).toBeTrue();
			expect(semver.isLessThanOrEqual("1.9.0", "2.1.0")).toBeTrue();
			expect(semver.isLessThanOrEqual("1.9.0", "1.9.1")).toBeTrue();
			expect(semver.isLessThanOrEqual("1.0.0", "10.0.0")).toBeTrue();
			expect(semver.isLessThanOrEqual("8.9.0", "10.0.0")).toBeTrue();
			expect(semver.isLessThanOrEqual("1.2.3-next.6", "1.2.3-next.10")).toBeTrue();
			expect(semver.isLessThanOrEqual("2.0.0-alpha-6", "2.0.0-alpha-10")).toBeTrue();
			expect(semver.isLessThanOrEqual("2.0.0-alpha.8", "2.0.0-beta.1")).toBeTrue();
		});

		it("should return false", () => {
			expect(semver.isLessThanOrEqual("2.1.0", "1.9.0")).toBeFalse();
			expect(semver.isLessThanOrEqual("1.9.1", "1.9.0")).toBeFalse();
			expect(semver.isLessThanOrEqual("10.0.0", "1.0.0")).toBeFalse();
			expect(semver.isLessThanOrEqual("10.0.0", "8.9.0")).toBeFalse();
			expect(semver.isLessThanOrEqual("1.2.3-next.10", "1.2.3-next.6")).toBeFalse();
			expect(semver.isLessThanOrEqual("2.0.0-alpha-10", "2.0.0-alpha-6")).toBeFalse();
			expect(semver.isLessThanOrEqual("2.0.0-beta.1", "2.0.0-alpha.8")).toBeFalse();
		});
	});
});
