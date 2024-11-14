// SPDX-License-Identifier: GNU GENERAL PUBLIC LICENSE
pragma solidity ^0.8.13;

import {
    ConsensusV1,
    ValidatorData,
    Validator,
    ValidatorUpdated,
    CallerIsOwner,
    ValidatorAlreadyRegistered,
    BlsKeyAlreadyRegistered,
    BlsKeyIsInvalid,
    CallerIsNotValidator
} from "@contracts/consensus/ConsensusV1.sol";
import {Base} from "./Base.sol";

contract ConsensusTest is Base {
    ConsensusV1 public consensus;

    function setUp() public {
        consensus = new ConsensusV1();
    }

    function test_updateBlsPublicKey_revert_if_caller_is_not_validator() public {
        vm.expectRevert(CallerIsNotValidator.selector);
        consensus.resignValidator();
    }

    function test_updateBlsPublicKey_revert_if_bls_key_is_already_registered() public {
        address addr = address(1);
        vm.startPrank(addr);

        consensus.registerValidator(prepareBLSKey(addr));

        vm.expectRevert(BlsKeyAlreadyRegistered.selector);
        consensus.updateValidator(prepareBLSKey(addr));
    }

    function test_updateBlsPublicKey_revert_if_bls_key_is_already_registered_by_different_vlidator() public {
        address addr = address(1);
        vm.startPrank(addr);
        consensus.registerValidator(prepareBLSKey(addr));

        address addr2 = address(2);
        vm.startPrank(addr2);
        consensus.registerValidator(prepareBLSKey(addr2));

        vm.expectRevert(BlsKeyAlreadyRegistered.selector);
        consensus.updateValidator(prepareBLSKey(addr));
    }

    function test_updateBlsPublicKey_revert_if_bls_key_is_invalid() public {
        address addr = address(1);
        vm.startPrank(addr);
        consensus.registerValidator(prepareBLSKey(addr));

        vm.expectRevert(BlsKeyIsInvalid.selector);
        consensus.updateValidator(prepareBLSKey(addr, 46));
        vm.expectRevert(BlsKeyIsInvalid.selector);
        consensus.updateValidator(prepareBLSKey(addr, 47));
        vm.expectRevert(BlsKeyIsInvalid.selector);
        consensus.updateValidator(prepareBLSKey(addr, 49));
        vm.expectRevert(BlsKeyIsInvalid.selector);
        consensus.updateValidator(prepareBLSKey(addr, 50));
    }

    function test_updateBlsPublicKey_should_pass() public {
        address addr = address(1);
        vm.startPrank(addr);
        consensus.registerValidator(prepareBLSKey(addr));

        vm.expectEmit(address(consensus));
        emit ValidatorUpdated(addr, prepareBLSKey(address(2)));
        consensus.updateValidator(prepareBLSKey(address(2)));

        Validator memory validator = consensus.getValidator(addr);
        assertEq(validator.addr, addr);
        assertEq(validator.data.blsPublicKey, prepareBLSKey(address(2)));
    }

    function test_updateBlsPublicKey_revert_on_second_update() public {
        address addr = address(1);
        vm.startPrank(addr);
        consensus.registerValidator(prepareBLSKey(addr));

        vm.expectEmit(address(consensus));
        emit ValidatorUpdated(addr, prepareBLSKey(address(2)));
        consensus.updateValidator(prepareBLSKey(address(2)));

        Validator memory validator = consensus.getValidator(addr);
        assertEq(validator.addr, addr);
        assertEq(validator.data.blsPublicKey, prepareBLSKey(address(2)));

        vm.expectRevert(BlsKeyAlreadyRegistered.selector);
        consensus.updateValidator(prepareBLSKey(address(2)));
    }
}
