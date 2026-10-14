// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Contracts returning revert data or ERC20 metadata that api-sync must not store. Compiled into ../untrusted-contracts.ts.

contract NulRevert {
    constructor() {
        revert(string(abi.encodePacked(bytes1(0))));
    }
}

contract UntrustedToken {
    uint256 public constant NUL_METADATA = 0;
    uint256 public constant HUGE_DECIMALS = 1;
    uint256 public constant LONG_SYMBOL = 2;
    uint256 public constant ENDLESS_NAME = 3;

    event Transfer(address indexed from, address indexed to, uint256 value);

    uint256 private immutable mode;

    constructor(uint256 mode_) {
        mode = mode_;
        emit Transfer(address(0), msg.sender, 1);
    }

    function name() external view returns (string memory) {
        if (mode == ENDLESS_NAME) {
            while (gasleft() > 0) {}
        }

        return mode == NUL_METADATA ? string(abi.encodePacked("Test", bytes1(0), "Token")) : "Test Token";
    }

    function symbol() external view returns (string memory) {
        if (mode == LONG_SYMBOL) {
            // 65 characters, one over the limit.
            return "SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS";
        }

        return mode == NUL_METADATA ? string(abi.encodePacked("T", bytes1(0), "ST")) : "TST";
    }

    function decimals() external view returns (uint256) {
        return mode == HUGE_DECIMALS ? 2 ** 31 : 18;
    }

    function totalSupply() external pure returns (uint256) {
        return 1;
    }

    function balanceOf(address) external pure returns (uint256) {
        return 1;
    }

    function allowance(address, address) external pure returns (uint256) {
        return 0;
    }

    function transfer(address, uint256) external pure returns (bool) {
        return true;
    }

    function transferFrom(address, address, uint256) external pure returns (bool) {
        return true;
    }

    function approve(address, uint256) external pure returns (bool) {
        return true;
    }
}
