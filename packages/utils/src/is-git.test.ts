import "jest-extended";

import { isGit } from "./is-git";

describe("#isGit", () => {
    it("should pass for Git URLs", () => {
        expect(isGit("ssh://user@github.com:port/owner/repo.git")).toBeTrue();
        expect(isGit("git://github.com/owner/repo.git")).toBeTrue();
        expect(isGit("git@github.com:owner/repo.git")).toBeTrue();
        expect(isGit("git@bitbucket.com:owner/repo.git")).toBeTrue();
        expect(isGit("git@gitlab.com:owner/repo.git")).toBeTrue();
        expect(isGit("https://github.com/owner/repo.git")).toBeTrue();
    });

    it("should fail for URLs other than Git", () => {
        expect(isGit("http://github.com/owner/repo")).toBeFalse();
        expect(isGit("https://github.com/owner/repo")).toBeFalse();
        expect(isGit("/owner/repo.git/")).toBeFalse();
        expect(isGit("file:///owner/repo.git/")).toBeFalse();
        expect(isGit("file://~/owner/repo.git/")).toBeFalse();
    });
});
