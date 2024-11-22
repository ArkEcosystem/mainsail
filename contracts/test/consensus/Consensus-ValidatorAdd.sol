// SPDX-License-Identifier: GNU GENERAL PUBLIC LICENSE
pragma solidity ^0.8.13;

import {
    ConsensusV1,
    ValidatorData,
    Validator,
    ValidatorRegistered,
    ValidatorAlreadyRegistered,
    BlsKeyAlreadyRegistered,
    ImportIsNotAllowed,
    BlsKeyIsInvalid
} from "@contracts/consensus/ConsensusV1.sol";
import {Base} from "./Base.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract ConsensusTest is Base {
    function test_validator_add_pass() public {
        assertEq(consensus.registeredValidatorsCount(), 0);
        assertEq(consensus.resignedValidatorsCount(), 0);
        address addr = address(1);

        // Act
        vm.expectEmit(address(consensus));
        emit ValidatorRegistered(addr, prepareBLSKey(addr));
        consensus.addValidator(addr, prepareBLSKey(addr), false);

        // Assert
        assertEq(consensus.registeredValidatorsCount(), 1);
        assertEq(consensus.resignedValidatorsCount(), 0);

        Validator memory validator = consensus.getValidator(addr);
        assertEq(validator.addr, addr);
        assertEq(validator.data.blsPublicKey, prepareBLSKey(addr));
        assertEq(validator.data.voteBalance, 0);
        assertEq(validator.data.votersCount, 0);
        assertEq(validator.data.isResigned, false);
    }

    function test_validator_add_pass_if_resigned() public {
        assertEq(consensus.registeredValidatorsCount(), 0);
        assertEq(consensus.resignedValidatorsCount(), 0);
        address addr = address(1);

        // Act
        vm.expectEmit(address(consensus));
        emit ValidatorRegistered(addr, prepareBLSKey(addr));
        consensus.addValidator(addr, prepareBLSKey(addr), true);

        // Assert
        assertEq(consensus.registeredValidatorsCount(), 1);
        assertEq(consensus.resignedValidatorsCount(), 1);
        Validator memory validator = consensus.getValidator(addr);
        assertEq(validator.addr, addr);
        assertEq(validator.data.blsPublicKey, prepareBLSKey(addr));
        assertEq(validator.data.voteBalance, 0);
        assertEq(validator.data.votersCount, 0);
        assertEq(validator.data.isResigned, true);
    }

    function test_validator_add_pass_if_ble_key_is_zero() public {
        assertEq(consensus.registeredValidatorsCount(), 0);
        assertEq(consensus.resignedValidatorsCount(), 0);
        address addr = address(1);

        // Act
        vm.expectEmit(address(consensus));
        emit ValidatorRegistered(addr, new bytes(0));
        consensus.addValidator(addr, new bytes(0), false);

        // Assert
        assertEq(consensus.registeredValidatorsCount(), 1);
        assertEq(consensus.resignedValidatorsCount(), 0);

        Validator memory validator = consensus.getValidator(addr);
        assertEq(validator.addr, addr);
        assertEq(validator.data.blsPublicKey, new bytes(0));
        assertEq(validator.data.voteBalance, 0);
        assertEq(validator.data.votersCount, 0);
        assertEq(validator.data.isResigned, false);
    }

    function test_validator_add_revert_if_caller_is_not_owner() public {
        address addr = address(1);
        vm.startPrank(addr);
        vm.expectRevert(abi.encodeWithSelector(OwnableUpgradeable.OwnableUnauthorizedAccount.selector, addr));
        consensus.addValidator(addr, prepareBLSKey(addr), false);
    }

    function test_validator_add_revert_if_round_already_calculated() public {
        address addr = address(1);
        consensus.addValidator(addr, prepareBLSKey(addr), false);

        consensus.calculateActiveValidators(1);

        vm.expectRevert(ImportIsNotAllowed.selector);
        consensus.addValidator(addr, prepareBLSKey(addr), false);
    }

    function test_validator_add_revert_if_validator_is_already_registered() public {
        address addr = address(1);
        consensus.addValidator(addr, prepareBLSKey(addr), false);

        vm.expectRevert(ValidatorAlreadyRegistered.selector);
        consensus.addValidator(addr, prepareBLSKey(addr), false);
    }

    function test_validator_registration_revert_if_bls_key_is_already_registered() public {
        address addr = address(1);
        consensus.addValidator(addr, prepareBLSKey(addr), false);

        vm.expectRevert(BlsKeyAlreadyRegistered.selector);
        consensus.addValidator(address(2), prepareBLSKey(addr), false);
    }

    function test_validator_registration_revert_if_bls_key_length_is_invalid() public {
        address addr = address(1);

        vm.expectRevert(BlsKeyIsInvalid.selector);
        consensus.addValidator(addr, prepareBLSKey(addr, 46), false);
        vm.expectRevert(BlsKeyIsInvalid.selector);
        consensus.addValidator(addr, prepareBLSKey(addr, 47), false);
        vm.expectRevert(BlsKeyIsInvalid.selector);
        consensus.addValidator(addr, prepareBLSKey(addr, 49), false);
        vm.expectRevert(BlsKeyIsInvalid.selector);
        consensus.addValidator(addr, prepareBLSKey(addr, 50), false);
    }
}
