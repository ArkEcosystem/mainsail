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

        consensus.calculateActiveValidators(1);
        ConsensusV1.Validator[] memory validators = consensus.getActiveValidators();
        assertEq(validators.length, 1);
        assertEq(validators[0].addr, addr);
    }

    function test_should_allow_only_caller() public {
        address addr = address(1);
        vm.startPrank(addr);
        vm.expectRevert(abi.encodeWithSelector(OwnableUpgradeable.OwnableUnauthorizedAccount.selector, addr));
        consensus.calculateActiveValidators(1);
    }

    function test_should_revert_with_0_parameter() public {
        registerValidator(address(1));

        vm.expectRevert(ConsensusV1.InvalidParameters.selector);
        consensus.calculateActiveValidators(0);
    }

    function test_should_revert_without_validators() public {
        vm.expectRevert(ConsensusV1.NoActiveValidators.selector);
        consensus.calculateActiveValidators(1);
    }

    function test_should_revert_with_only_resigned_validators() public {
        consensus.addValidator(address(2), prepareBLSKey(address(2)), true);

        vm.expectRevert(ConsensusV1.NoActiveValidators.selector);
        consensus.calculateActiveValidators(1);
    }

    function test_should_revert_with_only_validators_without_public_key() public {
        consensus.addValidator(address(1), new bytes(0), false);

        vm.expectRevert(ConsensusV1.NoActiveValidators.selector);
        consensus.calculateActiveValidators(1);
    }

    function test_should_ignore_resigned_validators() public {
        address addr = address(1);

        registerValidator(addr);
        registerValidator(address(2));
        resignValidator(addr);

        consensus.calculateActiveValidators(2);
        ConsensusV1.Validator[] memory validators = consensus.getActiveValidators();
        assertEq(validators.length, 2);
        assertEq(validators[0].addr, address(2));
        assertEq(validators[1].addr, address(2)); // Second validator is duplicated
    }

    // Inverted order
    function test_should_ignore_resigned_validators_2() public {
        address addr = address(1);

        registerValidator(addr);
        registerValidator(address(2));
        resignValidator(address(2));

        consensus.calculateActiveValidators(2);
        ConsensusV1.Validator[] memory validators = consensus.getActiveValidators();
        assertEq(validators.length, 2);
        assertEq(validators[0].addr, addr);
        assertEq(validators[1].addr, addr); // Second validator is duplicated
    }

    function test_should_ignore_validators_without_bls_public_key() public {
        address addr = address(1);

        registerValidator(addr);
        consensus.addValidator(address(2), new bytes(0), false);

        consensus.calculateActiveValidators(2);
        ConsensusV1.Validator[] memory validators = consensus.getActiveValidators();
        assertEq(validators.length, 2);
        assertEq(validators[0].addr, addr);
        assertEq(validators[1].addr, addr); // Second validator is duplicated
    }

    function test_consensus_sortedValidators_sameVoteCounts() public {
        vm.pauseGasMetering();
        assertEq(consensus.registeredValidatorsCount(), 0);

        uint256 n = 55;
        uint256 balance = 50;
        for (uint256 i = 0; i < n; i++) {
            address addr = address(uint160(i + 1));
            vm.deal(addr, balance);
            vm.startPrank(addr);

            if (balance > 0) {
                balance -= 1; // the last spots share same number of votes
            }

            consensus.registerValidator(prepareBLSKey(addr));
            consensus.vote(addr);
            vm.stopPrank();
        }

        vm.resumeGasMetering();

        uint160 activeValidators = 53;

        consensus.calculateActiveValidators(uint8(activeValidators));
        ConsensusV1.Validator[] memory validators = consensus.getActiveValidators();

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
        assertEq(consensus.registeredValidatorsCount(), 0);

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

            consensus.registerValidator(prepareBLSKey(addr));
            consensus.vote(addr);
            vm.stopPrank();
        }

        vm.resumeGasMetering();

        uint160 activeValidators = 53;

        consensus.calculateActiveValidators(uint8(activeValidators));
        ConsensusV1.Validator[] memory validators = consensus.getActiveValidators();
        assertEq(validators.length, activeValidators);

        assertEq(validators[activeValidators - 1].addr, address(0x1B)); // Shuffled address
        validators = sortValidators(validators);
        assertEq(validators[0].addr, highest);
        assertEq(validators[activeValidators - 1].addr, address(53));

        // Second attempt should return the same result
        consensus.calculateActiveValidators(uint8(activeValidators));

        validators = consensus.getActiveValidators();
        assertEq(validators[activeValidators - 1].addr, address(0x1B)); // Shuffled address
        validators = sortValidators(validators);
        assertEq(validators.length, activeValidators);
        assertEq(validators[0].addr, highest);
        assertEq(validators[activeValidators - 1].addr, address(53));
    }
}
