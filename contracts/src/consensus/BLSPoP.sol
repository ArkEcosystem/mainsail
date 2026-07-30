// SPDX-License-Identifier: GNU GENERAL PUBLIC LICENSE
pragma solidity ^0.8.36;

library BLSPoP {
    address internal constant POP_VERIFY = 0x0000000000000000000000000000000001181200;

    error InvalidInputLength();
    error PrecompileCallFailed();

    function verify(bytes calldata compressedPubkeyG1, bytes calldata compressedProofG2) internal view returns (bool) {
        if (compressedPubkeyG1.length != 48) {
            revert InvalidInputLength();
        }
        if (compressedProofG2.length != 96) {
            revert InvalidInputLength();
        }

        bytes memory input = bytes.concat(compressedPubkeyG1, compressedProofG2);

        (bool ok, bytes memory out) = POP_VERIFY.staticcall(input);
        if (!ok || out.length != 32) {
            revert PrecompileCallFailed();
        }

        return uint256(bytes32(out)) == 1;
    }
}
