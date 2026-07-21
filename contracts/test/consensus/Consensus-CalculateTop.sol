// SPDX-License-Identifier: GNU GENERAL PUBLIC LICENSE
pragma solidity ^0.8.13;

import {ConsensusV1} from "@contracts/consensus/ConsensusV1.sol";
import {Base} from "./Base.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract ConsensusTest is Base {
    function test_should_work_with_one_validator() public {
        address addr = address(1);
        registerValidator(addr);

        consensus.calculateRoundValidators(1);
        ConsensusV1.Validator[] memory validators = consensus.getRoundValidators();
        assertEq(validators.length, 1);
        assertEq(validators[0].addr, addr);
    }

    function test_should_allow_only_caller() public {
        address addr = address(1);
        vm.startPrank(addr);
        vm.expectRevert(abi.encodeWithSelector(OwnableUpgradeable.OwnableUnauthorizedAccount.selector, addr));
        consensus.calculateRoundValidators(1);
    }

    function test_should_revert_with_0_parameter() public {
        registerValidator(address(1));

        vm.expectRevert(ConsensusV1.InvalidParameters.selector);
        consensus.calculateRoundValidators(0);
    }

    function test_should_revert_without_validators() public {
        vm.expectRevert(abi.encodeWithSelector(ConsensusV1.InsufficientActiveValidators.selector, 0, 1));
        consensus.calculateRoundValidators(1);
    }

    function test_should_revert_with_only_resigned_validators() public {
        consensus.addValidator(address(2), true);

        vm.expectRevert(abi.encodeWithSelector(ConsensusV1.InsufficientActiveValidators.selector, 0, 1));
        consensus.calculateRoundValidators(1);
    }

    function test_should_revert_with_only_validators_without_public_key() public {
        consensus.addValidator(address(1), false);

        vm.expectRevert(abi.encodeWithSelector(ConsensusV1.InsufficientActiveValidators.selector, 0, 1));
        consensus.calculateRoundValidators(1);
    }

    function test_should_revert_with_insufficient_active_validators() public {
        registerValidator(address(1));
        registerValidator(address(2));

        consensus.calculateRoundValidators(2);
        assertEq(consensus.getRoundsCount(), 1);

        // Requesting more round slots than there are active validators must revert with the
        // exact available/required counts instead of padding slots with duplicates. The revert
        // is atomic: no new round is pushed and the previous round validators remain intact.
        vm.expectRevert(abi.encodeWithSelector(ConsensusV1.InsufficientActiveValidators.selector, 2, 3));
        consensus.calculateRoundValidators(3);

        assertEq(consensus.getRoundsCount(), 1);
        ConsensusV1.Validator[] memory validators = consensus.getRoundValidators();
        assertEq(validators.length, 2);
        assertTrue(validators[0].addr != validators[1].addr);
    }

    function test_should_not_count_resigned_validator_toward_round() public {
        address addr = address(1);

        registerValidator(addr);
        registerValidator(address(2));
        resignValidator(addr);

        // The resigned validator is not eligible, so only 1 of the 2 requested slots can be
        // filled with a distinct validator.
        vm.expectRevert(abi.encodeWithSelector(ConsensusV1.InsufficientActiveValidators.selector, 1, 2));
        consensus.calculateRoundValidators(2);
    }

    function test_should_not_count_validator_without_bls_public_key_toward_round() public {
        address addr = address(1);

        registerValidator(addr);
        consensus.addValidator(address(2), new bytes(0), false);

        // address(2) has no BLS key, so it is not eligible; only one eligible validator remains.
        vm.expectRevert(abi.encodeWithSelector(ConsensusV1.InsufficientActiveValidators.selector, 1, 2));
        consensus.calculateRoundValidators(2);
    }

    function test_should_exclude_resigned_validator_and_form_distinct_round() public {
        registerValidator(address(1));
        registerValidator(address(2));
        registerValidator(address(3));
        resignValidator(address(2));

        // Two eligible validators remain (1 and 3); the round is formed from DISTINCT validators,
        // excluding the resigned one and never duplicating a slot.
        consensus.calculateRoundValidators(2);
        ConsensusV1.Validator[] memory validators = consensus.getRoundValidators();
        assertEq(validators.length, 2);
        assertTrue(validators[0].addr != validators[1].addr); // no duplicate slot
        assertTrue(validators[0].addr != address(2) && validators[1].addr != address(2)); // resigned excluded
    }

    function test_consensus_sortedValidators_sameVoteCounts() public {
        vm.pauseGasMetering();
        assertEq(consensus.validatorsCount(), 0);

        bytes memory pop = createValidPop();

        uint256 n = 55;
        uint256 balance = 50;
        for (uint256 i = 0; i < n; i++) {
            address addr = address(uint160(i + 1));
            vm.deal(addr, balance);
            vm.startPrank(addr);

            if (balance > 0) {
                balance -= 1; // the last spots share same number of votes
            }

            consensus.registerValidator(prepareBLSKey(addr), pop);
            consensus.vote(addr);
            vm.stopPrank();
        }

        vm.resumeGasMetering();

        uint160 activeValidators = 53;

        consensus.calculateRoundValidators(uint8(activeValidators));
        ConsensusV1.Validator[] memory validators = consensus.getRoundValidators();

        for (uint256 i = 0; i < activeValidators; i++) {
            ConsensusV1.Validator memory validator = validators[i];

            // all addresses are below 0x35 (53) since they are sorted ascending if vote balance is equal.
            assertEq(validator.addr <= address(0x35), true);
        }

        validators = sortValidators(validators);
        assertEq(validators.length, activeValidators);

        // highest voter balance at top (lowest address)
        assertEq(validators[0].addr, address(0x01));
        assertEq(validators[0].data.voteBalance, uint256(50));

        // lowest voter balance at bottom (lowest address)
        assertEq(validators[activeValidators - 1].addr, address(0x35));
        assertEq(validators[activeValidators - 1].data.voteBalance, uint256(0));
    }

    function test_consensus_200_topValidators() public {
        vm.pauseGasMetering();
        assertEq(consensus.validatorsCount(), 0);

        bytes memory pop = createValidPop();

        address highest = address(0);
        uint256 highestBalance = 0;

        uint256 n = 200;
        for (uint256 i = 0; i < n; i++) {
            address addr = address(uint160(i + 1));
            uint256 balance = 0;
            vm.deal(addr, balance);

            if (balance == highestBalance) {
                if (addr < highest || highest == address(0)) {
                    highest = addr;
                }
            }

            if (balance > highestBalance) {
                highest = addr;
                highestBalance = balance;
            }

            vm.startPrank(addr);

            consensus.registerValidator(prepareBLSKey(addr), pop);
            consensus.vote(addr);
            vm.stopPrank();
        }

        vm.resumeGasMetering();

        uint160 activeValidators = 53;

        consensus.calculateRoundValidators(uint8(activeValidators));
        ConsensusV1.Validator[] memory validators = consensus.getRoundValidators();
        assertEq(validators.length, activeValidators);

        assertEq(validators[activeValidators - 1].addr, address(0x1B)); // Shuffled address
        validators = sortValidators(validators);
        assertEq(validators[0].addr, highest);
        assertEq(validators[activeValidators - 1].addr, address(53));

        // Second attempt should return the same result
        consensus.calculateRoundValidators(uint8(activeValidators));

        validators = consensus.getRoundValidators();
        assertEq(validators[activeValidators - 1].addr, address(0x1B)); // Shuffled address
        validators = sortValidators(validators);
        assertEq(validators.length, activeValidators);
        assertEq(validators[0].addr, highest);
        assertEq(validators[activeValidators - 1].addr, address(53));
    }
}
