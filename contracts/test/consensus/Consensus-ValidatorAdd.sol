// SPDX-License-Identifier: GNU GENERAL PUBLIC LICENSE
pragma solidity ^0.8.13;

import {ConsensusV1} from "@contracts/consensus/ConsensusV1.sol";
import {Base} from "./Base.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract ConsensusTest is Base {
    function test_validator_add_pass() public {
        assertEq(consensus.validatorsCount(), 0);
        assertEq(consensus.activeValidatorsCount(), 0);
        assertEq(consensus.resignedValidatorsCount(), 0);
        address addr = address(1);

        // Act
        vm.expectEmit(address(consensus));
        emit ConsensusV1.ValidatorRegistered(addr, new bytes(0));
        consensus.addValidator(addr, false);

        // Assert
        assertEq(consensus.validatorsCount(), 1);
        // Imported validators are dormant: registered but never active, because they
        // carry no BLS public key. They only become active via updateValidator().
        assertEq(consensus.activeValidatorsCount(), 0);
        assertEq(consensus.resignedValidatorsCount(), 0);

        ConsensusV1.Validator memory validator = consensus.getValidator(addr);
        assertEq(validator.addr, addr);
        assertEq(validator.data.blsPublicKey, new bytes(0));
        assertEq(validator.data.voteBalance, 0);
        assertEq(validator.data.votersCount, 0);
        assertEq(validator.data.fee, 0);
        assertEq(validator.data.isResigned, false);
    }

    function test_validator_add_pass_if_resigned() public {
        assertEq(consensus.validatorsCount(), 0);
        assertEq(consensus.activeValidatorsCount(), 0);
        assertEq(consensus.resignedValidatorsCount(), 0);
        address addr = address(1);

        // Act
        vm.expectEmit(address(consensus));
        emit ConsensusV1.ValidatorRegistered(addr, new bytes(0));
        consensus.addValidator(addr, true);

        // Assert
        assertEq(consensus.validatorsCount(), 1);
        assertEq(consensus.activeValidatorsCount(), 0);
        assertEq(consensus.resignedValidatorsCount(), 1);
        ConsensusV1.Validator memory validator = consensus.getValidator(addr);
        assertEq(validator.addr, addr);
        assertEq(validator.data.blsPublicKey, new bytes(0));
        assertEq(validator.data.voteBalance, 0);
        assertEq(validator.data.votersCount, 0);
        assertEq(validator.data.fee, 0);
        assertEq(validator.data.isResigned, true);
    }

    function test_validator_add_keeps_validators_dormant() public {
        // No matter how many validators are imported, none enter the active set:
        // the active set is only reachable via the PoP-verified registerValidator /
        // updateValidator paths.
        consensus.addValidator(address(1), false);
        consensus.addValidator(address(2), true);
        consensus.addValidator(address(3), false);

        assertEq(consensus.validatorsCount(), 3);
        assertEq(consensus.activeValidatorsCount(), 0);
        assertEq(consensus.resignedValidatorsCount(), 1);

        assertEq(consensus.getValidator(address(1)).data.blsPublicKey, new bytes(0));
        assertEq(consensus.getValidator(address(2)).data.blsPublicKey, new bytes(0));
        assertEq(consensus.getValidator(address(3)).data.blsPublicKey, new bytes(0));
    }

    function test_validator_add_revert_if_caller_is_not_owner() public {
        address addr = address(1);
        vm.startPrank(addr);
        vm.expectRevert(abi.encodeWithSelector(OwnableUpgradeable.OwnableUnauthorizedAccount.selector, addr));
        consensus.addValidator(addr, false);
        vm.stopPrank();
    }

    function test_validator_add_revert_if_round_already_calculated() public {
        // An active validator is required for the round calculation to succeed, since
        // imported (dormant) validators never enter the active set.
        registerValidator(address(1));

        consensus.calculateRoundValidators(1);

        vm.expectRevert(ConsensusV1.ImportIsNotAllowed.selector);
        consensus.addValidator(address(2), false);
    }

    function test_validator_add_revert_if_validator_is_already_registered() public {
        address addr = address(1);
        consensus.addValidator(addr, false);

        vm.expectRevert(ConsensusV1.ValidatorAlreadyRegistered.selector);
        consensus.addValidator(addr, false);
    }

    function test_validator_add_revert_if_validator_is_already_active() public {
        // A validator that registered through the live path cannot be shadow-imported.
        address addr = address(1);
        registerValidator(addr);

        vm.expectRevert(ConsensusV1.ValidatorAlreadyRegistered.selector);
        consensus.addValidator(addr, false);
    }
}
