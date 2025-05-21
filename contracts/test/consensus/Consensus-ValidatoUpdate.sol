// SPDX-License-Identifier: GNU GENERAL PUBLIC LICENSE
pragma solidity ^0.8.13;

import {ConsensusV1} from "@contracts/consensus/ConsensusV1.sol";
import {Base} from "./Base.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract ConsensusTest is Base {
    function test_resign_revert_if_caller_is_not_validator() public {
        vm.expectRevert(ConsensusV1.CallerIsNotValidator.selector);
        consensus.resignValidator();
    }

    function test_updateBlsPublicKey_revert_if_caller_is_not_validator() public {
        address addr = address(1);
        vm.startPrank(addr);

        vm.expectRevert(ConsensusV1.ValidatorNotRegistered.selector);
        consensus.updateValidator(prepareBLSKey(addr));
    }

    function test_updateBlsPublicKey_revert_if_bls_key_is_already_registered() public {
        address addr = address(1);
        vm.startPrank(addr);

        consensus.registerValidator(prepareBLSKey(addr));

        vm.expectRevert(ConsensusV1.BlsKeyAlreadyRegistered.selector);
        consensus.updateValidator(prepareBLSKey(addr));
    }

    function test_updateBlsPublicKey_revert_if_bls_key_is_already_registered_by_different_vlidator() public {
        address addr = address(1);
        vm.startPrank(addr);
        consensus.registerValidator(prepareBLSKey(addr));

        address addr2 = address(2);
        vm.startPrank(addr2);
        consensus.registerValidator(prepareBLSKey(addr2));

        vm.expectRevert(ConsensusV1.BlsKeyAlreadyRegistered.selector);
        consensus.updateValidator(prepareBLSKey(addr));
    }

    function test_updateBlsPublicKey_revert_if_bls_key_is_invalid() public {
        address addr = address(1);
        vm.startPrank(addr);
        consensus.registerValidator(prepareBLSKey(addr));

        vm.expectRevert(ConsensusV1.BlsKeyIsInvalid.selector);
        consensus.updateValidator(prepareBLSKey(addr, 46));
        vm.expectRevert(ConsensusV1.BlsKeyIsInvalid.selector);
        consensus.updateValidator(prepareBLSKey(addr, 47));
        vm.expectRevert(ConsensusV1.BlsKeyIsInvalid.selector);
        consensus.updateValidator(prepareBLSKey(addr, 49));
        vm.expectRevert(ConsensusV1.BlsKeyIsInvalid.selector);
        consensus.updateValidator(prepareBLSKey(addr, 50));
    }

    function test_updateBlsPublicKey_should_pass() public {
        address addr = address(1);
        vm.startPrank(addr);
        consensus.registerValidator(prepareBLSKey(addr));

        vm.expectEmit(address(consensus));
        emit ConsensusV1.ValidatorUpdated(addr, prepareBLSKey(address(2)));
        consensus.updateValidator(prepareBLSKey(address(2)));

        ConsensusV1.Validator memory validator = consensus.getValidator(addr);
        assertEq(validator.addr, addr);
        assertEq(validator.data.blsPublicKey, prepareBLSKey(address(2)));
    }

    function test_updateBlsPublicKey_revert_on_second_update() public {
        address addr = address(1);
        vm.startPrank(addr);
        consensus.registerValidator(prepareBLSKey(addr));

        vm.expectEmit(address(consensus));
        emit ConsensusV1.ValidatorUpdated(addr, prepareBLSKey(address(2)));
        consensus.updateValidator(prepareBLSKey(address(2)));

        ConsensusV1.Validator memory validator = consensus.getValidator(addr);
        assertEq(validator.addr, addr);
        assertEq(validator.data.blsPublicKey, prepareBLSKey(address(2)));

        vm.expectRevert(ConsensusV1.BlsKeyAlreadyRegistered.selector);
        consensus.updateValidator(prepareBLSKey(address(2)));
    }
}
