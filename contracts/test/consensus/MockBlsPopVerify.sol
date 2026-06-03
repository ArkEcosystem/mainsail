// SPDX-License-Identifier: GNU GENERAL PUBLIC LICENSE
pragma solidity ^0.8.13;

// Stateless mock that mimics the real BLS PoP precompile shape.
// Reads the last byte of `pop` to decide: 0x01 → valid, anything else → invalid.
// Lets tests pin success/failure without having to compute real signatures.
contract MockBlsPopVerify {
    fallback(bytes calldata input) external returns (bytes memory) {
        // Real precompile halts on bad length; we revert so tests can detect it.
        if (input.length != 48 + 96) {
            assembly { revert(0, 0) }
        }

        bool valid = uint8(input[input.length - 1]) == 0x01;
        return abi.encodePacked(uint256(valid ? 1 : 0));
    }
}
