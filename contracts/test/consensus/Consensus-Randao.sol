// SPDX-License-Identifier: GNU GENERAL PUBLIC LICENSE
pragma solidity ^0.8.13;

import {ConsensusV1} from "@contracts/consensus/ConsensusV1.sol";
import {Base} from "./Base.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract ConsensusRandaoTest is Base {
    event RandaoMixed(uint256 mix);


    function _reveal(bytes1 seed) internal pure returns (bytes memory reveal) {
        reveal = new bytes(96);
        reveal[0] = seed;
    }

    function _registerValidators(uint8 count) internal {
        for (uint160 i = 1; i <= count; i++) {
            registerValidator(address(i));
        }
    }

    function _roundOrder() internal view returns (address[] memory order) {
        ConsensusV1.Validator[] memory validators = consensus.getRoundValidators();
        order = new address[](validators.length);
        for (uint256 i = 0; i < validators.length; i++) {
            order[i] = validators[i].addr;
        }
    }

    function _sameOrder(address[] memory a, address[] memory b) internal pure returns (bool) {
        if (a.length != b.length) {
            return false;
        }
        for (uint256 i = 0; i < a.length; i++) {
            if (a[i] != b[i]) {
                return false;
            }
        }
        return true;
    }

    // Documents the original grind: before the RANDAO mix the shuffle was seeded from
    // block.timestamp, so warping the clock changed the slot order. After the fix the
    // timestamp must have NO influence on the shuffle.
    function test_shuffle_is_independent_of_timestamp() public {
        _registerValidators(10);

        vm.warp(1_000_000);
        consensus.calculateRoundValidators(10);
        address[] memory orderA = _roundOrder();

        // Same accumulator, wildly different timestamp -> identical order.
        vm.warp(2_000_000);
        consensus.calculateRoundValidators(10);
        address[] memory orderB = _roundOrder();

        assertTrue(_sameOrder(orderA, orderB), "slot order must not depend on block.timestamp");
    }

    function test_shuffle_changes_with_randao_mix() public {
        _registerValidators(10);

        consensus.calculateRoundValidators(10);
        address[] memory orderBefore = _roundOrder();

        consensus.mixRandao(_reveal(0xde));
        consensus.calculateRoundValidators(10);
        address[] memory orderAfter = _roundOrder();

        // With 10! possible orders a collision is overwhelmingly unlikely; a stable
        // collision here would indicate the seed is not wired into the shuffle at all.
        assertFalse(_sameOrder(orderBefore, orderAfter), "slot order must depend on the randao mix");
    }

    function test_mix_randao_chains_accumulator() public {
        assertEq(consensus.randaoMix(), 0);

        bytes memory revealA = new bytes(96);
        revealA[0] = 0x01;
        bytes memory revealB = new bytes(96);
        revealB[0] = 0x02;

        uint256 expectedA = uint256(keccak256(abi.encodePacked(uint256(0), revealA)));
        uint256 expectedAB = uint256(keccak256(abi.encodePacked(expectedA, revealB)));

        vm.expectEmit(true, true, true, true);
        emit RandaoMixed(expectedA);
        consensus.mixRandao(revealA);
        assertEq(consensus.randaoMix(), expectedA);

        vm.expectEmit(true, true, true, true);
        emit RandaoMixed(expectedAB);
        consensus.mixRandao(revealB);
        assertEq(consensus.randaoMix(), expectedAB);

        // Order sensitivity: mixing B then A must yield a different accumulator.
        uint256 expectedB = uint256(keccak256(abi.encodePacked(uint256(0), revealB)));
        uint256 expectedBA = uint256(keccak256(abi.encodePacked(expectedB, revealA)));
        assertTrue(expectedAB != expectedBA);
    }

    function test_mix_randao_only_owner() public {
        address addr = address(1);
        vm.startPrank(addr);
        vm.expectRevert(abi.encodeWithSelector(OwnableUpgradeable.OwnableUnauthorizedAccount.selector, addr));
        consensus.mixRandao(_reveal(0x00));
    }

    function test_mix_randao_rejects_wrong_length_reveal() public {
        vm.expectRevert(ConsensusV1.InvalidRevealLength.selector);
        consensus.mixRandao(hex"deadbeef");

        vm.expectRevert(ConsensusV1.InvalidRevealLength.selector);
        consensus.mixRandao(new bytes(95));

        vm.expectRevert(ConsensusV1.InvalidRevealLength.selector);
        consensus.mixRandao(new bytes(97));
    }

    function test_shuffle_is_pure_function_of_mix() public {
        _registerValidators(10);

        consensus.mixRandao(_reveal(0xca));
        consensus.calculateRoundValidators(10);
        address[] memory orderA = _roundOrder();

        // Re-running with an unchanged accumulator reproduces the exact order.
        consensus.calculateRoundValidators(10);
        address[] memory orderB = _roundOrder();

        assertTrue(_sameOrder(orderA, orderB), "same mix must produce the same slot order");
    }
}
