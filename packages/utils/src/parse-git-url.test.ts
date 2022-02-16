import "jest-extended";

import { parseGitUrl } from "./parse-git-url";

describe("#parseGitUrl", () => {
    it("should throw if it cannot find a host", () => {
        expect(() => parseGitUrl("owner/repo.git")).toThrow("Failed to find a host.");
    });

    it("should throw if it cannot find a name", () => {
        expect(() => parseGitUrl("git@github.com")).toThrow("Failed to find a name.");
    });

    it("should return the expected fields", () => {
        expect(parseGitUrl("git@github.com:owner/repo.git")).toEqual({
            host: "github.com",
            owner: "owner",
            name: "repo",
            repo: "owner/repo",
            branch: "master",
        });

        expect(parseGitUrl("https://github.com/owner/repo.git")).toEqual({
            host: "github.com",
            owner: "owner",
            name: "repo",
            repo: "owner/repo",
            branch: "master",
        });

        expect(parseGitUrl("https://github.com/owner/repo.git#develop")).toEqual({
            host: "github.com",
            owner: "owner",
            name: "repo",
            repo: "owner/repo",
            branch: "develop",
        });

        expect(parseGitUrl("https://github.com/owner/repo.git#f4991348ca779b68b8e7139cfcbc601e6d496612")).toEqual({
            host: "github.com",
            owner: "owner",
            name: "repo",
            repo: "owner/repo",
            branch: "f4991348ca779b68b8e7139cfcbc601e6d496612",
        });

        expect(parseGitUrl("https://github.com/owner/repo.git#develop#develop")).toEqual({
            host: "github.com",
            owner: "owner",
            name: "repo",
            repo: "owner/repo",
            branch: "develop",
        });
    });
});
