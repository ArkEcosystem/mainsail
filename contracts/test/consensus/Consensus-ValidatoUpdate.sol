// SPDX-License-Identifier: GNU GENERAL PUBLIC LICENSE
pragma solidity ^0.8.13;

import {ConsensusV1} from "@contracts/consensus/ConsensusV1.sol";
import {BLSPoP} from "@contracts/consensus/BLSPoP.sol";
import {Base} from "./Base.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract ConsensusTest is Base {
    function test_updateBlsPublicKey_should_pass() public {
        bytes memory pop = createValidPop();

        address addr = address(1);
        vm.startPrank(addr);
        consensus.registerValidator(prepareBLSKey(addr), pop);
        assertEq(consensus.validatorsCount(), 1);
        assertEq(consensus.activeValidatorsCount(), 1);

        vm.expectEmit(address(consensus));
        emit ConsensusV1.ValidatorUpdated(addr, prepareBLSKey(address(2)));
        consensus.updateValidator(prepareBLSKey(address(2)), pop);

        assertEq(consensus.validatorsCount(), 1);
        assertEq(consensus.activeValidatorsCount(), 1);
        ConsensusV1.Validator memory validator = consensus.getValidator(addr);
        assertEq(validator.addr, addr);
        assertEq(validator.data.blsPublicKey, prepareBLSKey(address(2)));
    }

    function test_updateBlsPublicKey_should_set_active_validator_if_bls_key_was_empty() public {
        bytes memory pop = createValidPop();

        address addr = address(1);
        consensus.addValidator(addr, false);
        assertEq(consensus.validatorsCount(), 1);
        assertEq(consensus.activeValidatorsCount(), 0);

        vm.startPrank(addr);
        vm.expectEmit(address(consensus));
        emit ConsensusV1.ValidatorUpdated(addr, prepareBLSKey(addr));
        consensus.updateValidator(prepareBLSKey(addr), pop);

        assertEq(consensus.validatorsCount(), 1);
        assertEq(consensus.activeValidatorsCount(), 1);
        ConsensusV1.Validator memory validator = consensus.getValidator(addr);
        assertEq(validator.addr, addr);
        assertEq(validator.data.blsPublicKey, prepareBLSKey(addr));
    }

    function test_resign_revert_if_caller_is_not_validator() public {
        vm.expectRevert(ConsensusV1.CallerIsNotValidator.selector);
        consensus.resignValidator();
    }

    function test_updateBlsPublicKey_revert_if_caller_is_not_validator() public {
        bytes memory pop = createValidPop();

        address addr = address(1);
        vm.startPrank(addr);

        vm.expectRevert(ConsensusV1.ValidatorNotRegistered.selector);
        consensus.updateValidator(prepareBLSKey(addr), pop);
    }

    function test_updateBlsPublicKey_revert_if_bls_key_is_already_registered() public {
        bytes memory pop = createValidPop();

        address addr = address(1);
        vm.startPrank(addr);

        consensus.registerValidator(prepareBLSKey(addr), pop);

        vm.expectRevert(ConsensusV1.BlsKeyAlreadyRegistered.selector);
        consensus.updateValidator(prepareBLSKey(addr), pop);
    }

    function test_updateBlsPublicKey_revert_if_bls_key_is_already_registered_by_different_validator() public {
        bytes memory pop = createValidPop();

        address addr = address(1);
        vm.startPrank(addr);
        consensus.registerValidator(prepareBLSKey(addr), pop);

        address addr2 = address(2);
        vm.startPrank(addr2);
        consensus.registerValidator(prepareBLSKey(addr2), pop);

        vm.expectRevert(ConsensusV1.BlsKeyAlreadyRegistered.selector);
        consensus.updateValidator(prepareBLSKey(addr), pop);
    }

    function test_updateBlsPublicKey_revert_if_bls_key_is_invalid() public {
        bytes memory pop = createValidPop();

        address addr = address(1);
        vm.startPrank(addr);
        consensus.registerValidator(prepareBLSKey(addr), pop);

        vm.expectRevert(BLSPoP.InvalidInputLength.selector);
        consensus.updateValidator(prepareBLSKey(addr, 46), pop);
        vm.expectRevert(BLSPoP.InvalidInputLength.selector);
        consensus.updateValidator(prepareBLSKey(addr, 47), pop);
        vm.expectRevert(BLSPoP.InvalidInputLength.selector);
        consensus.updateValidator(prepareBLSKey(addr, 49), pop);
        vm.expectRevert(BLSPoP.InvalidInputLength.selector);
        consensus.updateValidator(prepareBLSKey(addr, 50), pop);
    }

    function test_updateBlsPublicKey_revert_if_pop_invalid() public {
        bytes memory validPop = createValidPop();
        bytes memory invalidPop = createInvalidPop();

        address addr = address(1);
        vm.startPrank(addr);
        consensus.registerValidator(prepareBLSKey(addr), validPop);

        vm.expectRevert(ConsensusV1.InvalidProofOfPossession.selector);
        consensus.updateValidator(prepareBLSKey(addr), invalidPop);
    }

    function test_updateBlsPublicKey_revert_on_second_update() public {
        bytes memory pop = createValidPop();

        address addr = address(1);
        vm.startPrank(addr);
        consensus.registerValidator(prepareBLSKey(addr), pop);

        vm.expectEmit(address(consensus));
        emit ConsensusV1.ValidatorUpdated(addr, prepareBLSKey(address(2)));
        consensus.updateValidator(prepareBLSKey(address(2)), pop);

        ConsensusV1.Validator memory validator = consensus.getValidator(addr);
        assertEq(validator.addr, addr);
        assertEq(validator.data.blsPublicKey, prepareBLSKey(address(2)));

        vm.expectRevert(ConsensusV1.BlsKeyAlreadyRegistered.selector);
        consensus.updateValidator(prepareBLSKey(address(2)), pop);
    }
}
