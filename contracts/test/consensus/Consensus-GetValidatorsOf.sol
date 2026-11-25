// SPDX-License-Identifier: GNU GENERAL PUBLIC LICENSE
pragma solidity ^0.8.13;

import {ConsensusV1} from "@contracts/consensus/ConsensusV1.sol";
import {Base} from "./Base.sol";

contract ConsensusTest is Base {
    function accounts(address a) internal pure returns (address[] memory result) {
        result = new address[](1);
        result[0] = a;
    }

    function accounts(address a, address b) internal pure returns (address[] memory result) {
        result = new address[](2);
        result[0] = a;
        result[1] = b;
    }

    function vote(address voter, address validator) internal {
        vm.deal(voter, 100 ether);
        vm.startPrank(voter);
        consensus.vote(validator);
        vm.stopPrank();
    }

    function test_getValidatorsOf_should_return_empty_for_empty_input() public view {
        assertEq(consensus.getValidatorsOf(new address[](0)).length, 0);
    }

    function test_getValidatorsOf_should_return_empty_for_unknown_accounts() public {
        registerValidator(address(1));

        assertEq(consensus.getValidatorsOf(accounts(address(0), address(2))).length, 0);
    }

    function test_getValidatorsOf_should_return_a_validator_itself() public {
        registerValidator(address(1));

        ConsensusV1.Validator[] memory validators = consensus.getValidatorsOf(accounts(address(1)));
        assertEq(validators.length, 1);
        assertEq(validators[0].addr, address(1));
        assertEq(validators[0].data.blsPublicKey, prepareBLSKey(address(1)));
    }

    function test_getValidatorsOf_should_return_the_target_of_a_voter() public {
        registerValidator(address(1));
        vote(address(2), address(1));

        ConsensusV1.Validator[] memory validators = consensus.getValidatorsOf(accounts(address(2)));
        assertEq(validators.length, 1);
        assertEq(validators[0].addr, address(1));
        assertEq(validators[0].data.voteBalance, 100 ether);
        assertEq(validators[0].data.votersCount, 1);
    }

    function test_getValidatorsOf_should_return_a_validator_and_its_target() public {
        registerValidator(address(1));
        registerValidator(address(2));
        vote(address(2), address(1));

        ConsensusV1.Validator[] memory validators = consensus.getValidatorsOf(accounts(address(2)));
        assertEq(validators.length, 2);
        assertEq(validators[0].addr, address(2));
        assertEq(validators[1].addr, address(1));
    }

    function test_getValidatorsOf_should_return_a_self_voting_validator_once() public {
        registerValidator(address(1));
        vote(address(1), address(1));

        ConsensusV1.Validator[] memory validators = consensus.getValidatorsOf(accounts(address(1)));
        assertEq(validators.length, 1);
        assertEq(validators[0].addr, address(1));
        assertEq(validators[0].data.votersCount, 1);
    }

    function test_getValidatorsOf_should_return_nothing_after_unvote() public {
        registerValidator(address(1));
        vote(address(2), address(1));

        vm.prank(address(2));
        consensus.unvote();

        assertEq(consensus.getValidatorsOf(accounts(address(2))).length, 0);
    }

    function test_getValidatorsOf_should_return_resigned_validators() public {
        registerValidator(address(1));
        registerValidator(address(2));
        vote(address(3), address(2));
        resignValidator(address(2));

        ConsensusV1.Validator[] memory validators = consensus.getValidatorsOf(accounts(address(2), address(3)));
        assertEq(validators.length, 2);
        assertEq(validators[0].addr, address(2));
        assertEq(validators[0].data.isResigned, true);
        assertEq(validators[1].addr, address(2));
        assertEq(validators[1].data.isResigned, true);
    }

    function test_getValidatorsOf_should_return_imported_validators_and_votes() public {
        consensus.addValidator(address(1), false);
        address[] memory voters = accounts(address(2));
        address[] memory targets = accounts(address(1));
        consensus.addVotes(voters, targets);

        ConsensusV1.Validator[] memory validators = consensus.getValidatorsOf(accounts(address(1), address(2)));
        assertEq(validators.length, 2);
        assertEq(validators[0].addr, address(1));
        assertEq(validators[1].addr, address(1));
        assertEq(validators[1].data.votersCount, 1);
    }

    function test_getValidatorsOf_should_keep_input_order() public {
        registerValidator(address(1));
        registerValidator(address(2));
        vote(address(3), address(2));

        ConsensusV1.Validator[] memory validators = consensus.getValidatorsOf(accounts(address(3), address(1)));
        assertEq(validators.length, 2);
        assertEq(validators[0].addr, address(2));
        assertEq(validators[1].addr, address(1));
    }

    function test_getValidatorsOf_should_return_only_the_current_target_after_a_vote_switch() public {
        registerValidator(address(1));
        registerValidator(address(2));
        vote(address(3), address(1));
        vote(address(3), address(2));

        ConsensusV1.Validator[] memory validators = consensus.getValidatorsOf(accounts(address(3)));
        assertEq(validators.length, 1);
        assertEq(validators[0].addr, address(2));
        assertEq(validators[0].data.votersCount, 1);
        assertEq(consensus.getValidator(address(1)).data.votersCount, 0);
    }

    function test_getValidatorsOf_should_return_duplicates_for_repeated_accounts() public {
        registerValidator(address(1));

        ConsensusV1.Validator[] memory validators = consensus.getValidatorsOf(accounts(address(1), address(1)));
        assertEq(validators.length, 2);
        assertEq(validators[0].addr, address(1));
        assertEq(validators[1].addr, address(1));
    }

    function test_getValidatorsOf_should_handle_1000_accounts() public {
        registerValidator(address(1));
        vote(address(2), address(1));

        address[] memory input = new address[](1000);
        for (uint256 i = 0; i < input.length; i++) {
            input[i] = address(uint160(i + 1));
        }

        ConsensusV1.Validator[] memory validators = consensus.getValidatorsOf(input);
        assertEq(validators.length, 2);
        assertEq(validators[0].addr, address(1));
        assertEq(validators[1].addr, address(1));
    }
}
