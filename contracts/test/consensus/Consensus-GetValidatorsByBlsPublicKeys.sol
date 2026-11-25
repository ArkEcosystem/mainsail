// SPDX-License-Identifier: GNU GENERAL PUBLIC LICENSE
pragma solidity ^0.8.13;

import {ConsensusV1} from "@contracts/consensus/ConsensusV1.sol";
import {Base} from "./Base.sol";

contract ConsensusTest is Base {
    function keys(bytes memory a) internal pure returns (bytes[] memory result) {
        result = new bytes[](1);
        result[0] = a;
    }

    function keys(bytes memory a, bytes memory b, bytes memory c) internal pure returns (bytes[] memory result) {
        result = new bytes[](3);
        result[0] = a;
        result[1] = b;
        result[2] = c;
    }

    function test_getValidatorsByBlsPublicKeys_should_return_empty_for_empty_input() public view {
        assertEq(consensus.getValidatorsByBlsPublicKeys(new bytes[](0)).length, 0);
    }

    function test_getValidatorsByBlsPublicKeys_should_return_the_registering_validator() public {
        registerValidator(address(1));

        ConsensusV1.Validator[] memory validators =
            consensus.getValidatorsByBlsPublicKeys(keys(prepareBLSKey(address(1))));
        assertEq(validators.length, 1);
        assertEq(validators[0].addr, address(1));
        assertEq(validators[0].data.blsPublicKey, prepareBLSKey(address(1)));
        assertEq(validators[0].data.isResigned, false);
    }

    function test_getValidatorsByBlsPublicKeys_should_return_zero_address_for_unknown_keys() public {
        registerValidator(address(1));

        ConsensusV1.Validator[] memory validators =
            consensus.getValidatorsByBlsPublicKeys(keys(prepareBLSKey(address(2)), bytes(""), new bytes(3)));
        assertEq(validators.length, 3);
        for (uint256 i = 0; i < validators.length; i++) {
            assertEq(validators[i].addr, address(0));
            assertEq(validators[i].data.blsPublicKey, bytes(""));
        }
    }

    function test_getValidatorsByBlsPublicKeys_should_keep_input_order() public {
        registerValidator(address(1));
        registerValidator(address(2));

        ConsensusV1.Validator[] memory validators = consensus.getValidatorsByBlsPublicKeys(
            keys(prepareBLSKey(address(2)), prepareBLSKey(address(3)), prepareBLSKey(address(1)))
        );
        assertEq(validators.length, 3);
        assertEq(validators[0].addr, address(2));
        assertEq(validators[1].addr, address(0));
        assertEq(validators[2].addr, address(1));
    }

    function test_getValidatorsByBlsPublicKeys_should_return_the_validator_of_a_replaced_key() public {
        registerValidator(address(1));

        vm.prank(address(1));
        consensus.updateValidator(prepareBLSKey(address(2)), createValidPop());

        ConsensusV1.Validator[] memory validators = consensus.getValidatorsByBlsPublicKeys(
            keys(prepareBLSKey(address(1)), prepareBLSKey(address(2)), prepareBLSKey(address(3)))
        );
        assertEq(validators[0].addr, address(1));
        assertEq(validators[0].data.blsPublicKey, prepareBLSKey(address(2)));
        assertEq(validators[1].addr, address(1));
        assertEq(validators[1].data.blsPublicKey, prepareBLSKey(address(2)));
        assertEq(validators[2].addr, address(0));
    }

    function test_getValidatorsByBlsPublicKeys_should_return_resigned_validators() public {
        registerValidator(address(1));
        registerValidator(address(2));
        resignValidator(address(2));

        ConsensusV1.Validator[] memory validators =
            consensus.getValidatorsByBlsPublicKeys(keys(prepareBLSKey(address(2))));
        assertEq(validators[0].addr, address(2));
        assertEq(validators[0].data.isResigned, true);
    }

    function test_getValidatorsByBlsPublicKeys_should_return_an_imported_validator_after_its_key_update() public {
        consensus.addValidator(address(1), false);

        vm.prank(address(1));
        consensus.updateValidator(prepareBLSKey(address(1)), createValidPop());

        ConsensusV1.Validator[] memory validators =
            consensus.getValidatorsByBlsPublicKeys(keys(prepareBLSKey(address(1))));
        assertEq(validators[0].addr, address(1));
    }

    function test_getValidatorsByBlsPublicKeys_should_return_zero_address_for_oversized_keys() public {
        registerValidator(address(1));

        bytes memory oversized = bytes.concat(prepareBLSKey(address(1)), hex"00");
        ConsensusV1.Validator[] memory validators = consensus.getValidatorsByBlsPublicKeys(keys(oversized));
        assertEq(validators[0].addr, address(0));
    }

    function test_getValidatorsByBlsPublicKeys_should_handle_1000_keys() public {
        registerValidator(address(1));

        bytes[] memory input = new bytes[](1000);
        for (uint256 i = 0; i < input.length; i++) {
            input[i] = prepareBLSKey(address(uint160(i + 1)));
        }

        ConsensusV1.Validator[] memory validators = consensus.getValidatorsByBlsPublicKeys(input);
        assertEq(validators.length, 1000);
        assertEq(validators[0].addr, address(1));
        for (uint256 i = 1; i < validators.length; i++) {
            assertEq(validators[i].addr, address(0));
        }
    }

    function test_replaced_key_should_stay_reserved_for_its_validator() public {
        registerValidator(address(1));

        vm.prank(address(1));
        consensus.updateValidator(prepareBLSKey(address(2)), createValidPop());

        vm.prank(address(3));
        vm.expectRevert(ConsensusV1.BlsKeyAlreadyRegistered.selector);
        consensus.registerValidator(prepareBLSKey(address(1)), createValidPop());

        ConsensusV1.Validator[] memory validators =
            consensus.getValidatorsByBlsPublicKeys(keys(prepareBLSKey(address(1))));
        assertEq(validators[0].addr, address(1));
    }
}
