import { describe } from "../../core-test-framework";
import { isSSH } from "./is-ssh";

describe("isSSH", async ({ assert, it, nock, loader }) => {
	it("should pass for SSH URLs", () => {
		assert.true(isSSH("ssh://user@github.com:port/owner/repo.git"));
		assert.true(isSSH("user@github.com:/owner/repo.git"));
		assert.true(isSSH("user@github.com:~user/owner/repo.git"));
		assert.true(isSSH("user@github.com:owner/repo.git"));
		assert.true(isSSH("rsync://github.com/owner/repo.git"));
		assert.true(isSSH("git://github.com/owner/repo.git"));
	});

	it("should fail for URLs other than SSH", () => {
		assert.true(isSSH("ssh://user@github.com:port/owner/repo.git"));
		assert.true(isSSH("user@github.com:/owner/repo.git"));
		assert.true(isSSH("user@github.com:~user/owner/repo.git"));
		assert.true(isSSH("user@github.com:owner/repo.git"));
		assert.true(isSSH("rsync://github.com/owner/repo.git"));
		assert.true(isSSH("git://github.com/owner/repo.git"));
		assert.false(isSSH("http://github.com/owner/repo.git"));
		assert.false(isSSH("https://github.com/owner/repo.git"));
		assert.false(isSSH("/owner/repo.git/"));
		assert.false(isSSH("file:///owner/repo.git/"));
		assert.false(isSSH("file://~/owner/repo.git/"));
	});
});
