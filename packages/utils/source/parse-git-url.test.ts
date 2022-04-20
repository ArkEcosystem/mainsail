import { describe } from "../../core-test-framework";
import { parseGitUrl } from "./parse-git-url";

describe("#parseGitUrl", ({ it, assert }) => {
	it("should throw if it cannot find a host", () => {
		assert.throws(() => parseGitUrl("owner/repo.git"), "Failed to find a host.");
	});

	it("should throw if it cannot find a name", () => {
		assert.throws(() => parseGitUrl("git@github.com"), "Failed to find a name.");
	});

	it("should return the expected fields", () => {
		assert.equal(parseGitUrl("git@github.com:owner/repo.git"), {
			branch: "master",
			host: "github.com",
			name: "repo",
			owner: "owner",
			repo: "owner/repo",
		});

		assert.equal(parseGitUrl("https://github.com/owner/repo.git"), {
			branch: "master",
			host: "github.com",
			name: "repo",
			owner: "owner",
			repo: "owner/repo",
		});

		assert.equal(parseGitUrl("https://github.com/owner/repo.git#develop"), {
			branch: "develop",
			host: "github.com",
			name: "repo",
			owner: "owner",
			repo: "owner/repo",
		});

		assert.equal(parseGitUrl("https://github.com/owner/repo.git#f4991348ca779b68b8e7139cfcbc601e6d496612"), {
			branch: "f4991348ca779b68b8e7139cfcbc601e6d496612",
			host: "github.com",
			name: "repo",
			owner: "owner",
			repo: "owner/repo",
		});

		assert.equal(parseGitUrl("https://github.com/owner/repo.git#develop#develop"), {
			branch: "develop",
			host: "github.com",
			name: "repo",
			owner: "owner",
			repo: "owner/repo",
		});
	});
});
