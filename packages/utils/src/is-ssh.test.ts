import "jest-extended";

import { isSSH } from "./is-ssh";

describe("#isSSH", () => {
    it("should pass for SSH URLs", () => {
        expect(isSSH("ssh://user@github.com:port/owner/repo.git")).toBeTrue();
        expect(isSSH("user@github.com:/owner/repo.git")).toBeTrue();
        expect(isSSH("user@github.com:~user/owner/repo.git")).toBeTrue();
        expect(isSSH("user@github.com:owner/repo.git")).toBeTrue();
        expect(isSSH("rsync://github.com/owner/repo.git")).toBeTrue();
        expect(isSSH("git://github.com/owner/repo.git")).toBeTrue();
    });

    it("should fail for URLs other than SSH", () => {
        expect(isSSH("ssh://user@github.com:port/owner/repo.git")).toBeTrue();
        expect(isSSH("user@github.com:/owner/repo.git")).toBeTrue();
        expect(isSSH("user@github.com:~user/owner/repo.git")).toBeTrue();
        expect(isSSH("user@github.com:owner/repo.git")).toBeTrue();
        expect(isSSH("rsync://github.com/owner/repo.git")).toBeTrue();
        expect(isSSH("git://github.com/owner/repo.git")).toBeTrue();
        expect(isSSH("http://github.com/owner/repo.git")).toBeFalse();
        expect(isSSH("https://github.com/owner/repo.git")).toBeFalse();
        expect(isSSH("/owner/repo.git/")).toBeFalse();
        expect(isSSH("file:///owner/repo.git/")).toBeFalse();
        expect(isSSH("file://~/owner/repo.git/")).toBeFalse();
    });
});
