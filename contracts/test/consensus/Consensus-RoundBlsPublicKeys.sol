// SPDX-License-Identifier: GNU GENERAL PUBLIC LICENSE
pragma solidity ^0.8.13;

import {ConsensusV1} from "@contracts/consensus/ConsensusV1.sol";
import {Base} from "./Base.sol";

contract ConsensusTest is Base {
    uint256 internal constant ROUND_BLS_PUBLIC_KEYS_SLOT = 18;

    function blsKey(address addr, uint256 version) internal pure returns (bytes memory) {
        return bytes.concat(keccak256(abi.encode(addr, version)), bytes16(keccak256(abi.encode(version, addr))));
    }

    function register(address addr) internal {
        vm.prank(addr);
        consensus.registerValidator(blsKey(addr, 0), createValidPop());
    }

    function update(address addr, uint256 version) internal {
        vm.prank(addr);
        consensus.updateValidator(blsKey(addr, version), createValidPop());
    }

    function moveVoteTo(address validator) internal {
        address voter = address(uint160(0xbeef));
        vm.deal(voter, 100 ether);
        vm.prank(voter);
        consensus.vote(validator);
    }

    function roundKeySlots(address addr) internal pure returns (bytes32 length, bytes32 data0, bytes32 data1) {
        length = keccak256(abi.encode(addr, ROUND_BLS_PUBLIC_KEYS_SLOT));
        data0 = keccak256(abi.encode(length));
        data1 = bytes32(uint256(data0) + 1);
    }

    function assertRoundKeyStored(address addr, bytes memory key) internal view {
        (bytes32 length, bytes32 data0, bytes32 data1) = roundKeySlots(addr);
        bytes memory tail = new bytes(32);
        for (uint256 i = 32; i < 48; i++) {
            tail[i - 32] = key[i];
        }

        assertEq(uint256(vm.load(address(consensus), length)), 48 * 2 + 1);
        assertEq(vm.load(address(consensus), data0), bytes32(key));
        assertEq(vm.load(address(consensus), data1), bytes32(tail));
    }

    function assertRoundKeyFreed(address addr) internal view {
        (bytes32 length, bytes32 data0, bytes32 data1) = roundKeySlots(addr);

        assertEq(vm.load(address(consensus), length), bytes32(0));
        assertEq(vm.load(address(consensus), data0), bytes32(0));
        assertEq(vm.load(address(consensus), data1), bytes32(0));
    }

    function roundKeyOf(address addr) internal view returns (bytes memory) {
        ConsensusV1.Validator[] memory validators = consensus.getRoundValidators();
        for (uint256 i = 0; i < validators.length; i++) {
            if (validators[i].addr == addr) {
                return validators[i].data.blsPublicKey;
            }
        }

        revert("not a round validator");
    }

    function fuzzAccount(uint256 index) internal pure returns (address) {
        return address(uint160(0x5000 + index));
    }

    function fuzzIndex(address addr) internal pure returns (uint256) {
        return uint160(addr) - 0x5000;
    }

    function assertRoundKeys(bytes[] memory roundKeys) internal view {
        ConsensusV1.Validator[] memory validators = consensus.getRoundValidators();
        uint256 members = 0;

        for (uint256 index = 1; index < roundKeys.length; index++) {
            address addr = fuzzAccount(index);
            if (roundKeys[index].length == 0) {
                assertRoundKeyFreed(addr);
                continue;
            }

            members++;
            assertEq(roundKeyOf(addr), roundKeys[index]);
            assertRoundKeyStored(addr, roundKeys[index]);
        }

        assertEq(validators.length, members);
    }

    function test_should_apply_bls_public_key_update_from_next_round() public {
        register(address(1));
        consensus.calculateRoundValidators(1);

        update(address(1), 1);
        update(address(1), 2);

        assertEq(consensus.getValidator(address(1)).data.blsPublicKey, blsKey(address(1), 2));
        assertEq(roundKeyOf(address(1)), blsKey(address(1), 0));
        assertRoundKeyStored(address(1), blsKey(address(1), 0));

        consensus.calculateRoundValidators(1);

        assertEq(roundKeyOf(address(1)), blsKey(address(1), 2));
        assertRoundKeyStored(address(1), blsKey(address(1), 2));

        update(address(1), 3);

        assertEq(roundKeyOf(address(1)), blsKey(address(1), 2));

        consensus.calculateRoundValidators(1);

        assertEq(roundKeyOf(address(1)), blsKey(address(1), 3));
        assertRoundKeyStored(address(1), blsKey(address(1), 3));
    }

    function test_should_use_bls_public_key_updated_before_first_round() public {
        register(address(1));
        consensus.addValidator(address(2), false);

        update(address(1), 1);
        update(address(2), 1);

        consensus.calculateRoundValidators(2);

        assertEq(roundKeyOf(address(1)), blsKey(address(1), 1));
        assertEq(roundKeyOf(address(2)), blsKey(address(2), 1));
    }

    function test_should_return_round_bls_public_key_with_live_validator_data() public {
        register(address(1));
        register(address(2));
        moveVoteTo(address(1));
        consensus.calculateRoundValidators(1);

        update(address(1), 1);
        vm.deal(address(0xcafe), 200 ether);
        vm.prank(address(0xcafe));
        consensus.vote(address(1));
        vm.deal(address(0xbeef), 150 ether);
        address[] memory voters = new address[](1);
        voters[0] = address(0xbeef);
        consensus.updateVoters(voters);
        vm.prank(address(0xbeef));
        consensus.unvote();
        vm.prank(address(1));
        consensus.resignValidator();

        ConsensusV1.Validator memory live = consensus.getValidator(address(1));
        ConsensusV1.Validator[] memory validators = consensus.getRoundValidators();

        assertEq(validators.length, 1);
        assertEq(validators[0].addr, address(1));
        assertEq(validators[0].data.voteBalance, 200 ether);
        assertEq(validators[0].data.votersCount, 1);
        assertTrue(validators[0].data.isResigned);
        assertEq(validators[0].data.blsPublicKey, blsKey(address(1), 0));
        assertEq(live.data.blsPublicKey, blsKey(address(1), 1));
        assertRoundKeyStored(address(1), blsKey(address(1), 0));
    }

    function test_should_return_fee_of_each_round_validator() public {
        register(address(1));
        consensus.setFee(3 ether);
        vm.deal(address(2), 3 ether);
        vm.prank(address(2));
        consensus.registerValidator{value: 3 ether}(blsKey(address(2), 0), createValidPop());
        consensus.setFee(5 ether);
        consensus.calculateRoundValidators(2);

        ConsensusV1.Validator[] memory validators = consensus.getRoundValidators();

        assertEq(validators.length, 2);
        for (uint256 i = 0; i < validators.length; i++) {
            assertEq(validators[i].data.fee, validators[i].addr == address(2) ? 3 ether : 0);
        }
    }

    function test_should_free_round_bls_public_key_of_validator_leaving_round() public {
        register(address(1));
        register(address(2));
        moveVoteTo(address(1));
        consensus.calculateRoundValidators(1);

        assertRoundKeyStored(address(1), blsKey(address(1), 0));
        assertRoundKeyFreed(address(2));

        moveVoteTo(address(2));
        consensus.calculateRoundValidators(1);

        assertRoundKeyFreed(address(1));
        assertRoundKeyStored(address(2), blsKey(address(2), 0));
    }

    function test_should_free_round_bls_public_key_of_resigned_validator() public {
        register(address(1));
        register(address(2));
        register(address(3));
        moveVoteTo(address(1));
        consensus.calculateRoundValidators(2);

        vm.prank(address(1));
        consensus.resignValidator();

        assertRoundKeyStored(address(1), blsKey(address(1), 0));

        consensus.calculateRoundValidators(2);

        assertRoundKeyFreed(address(1));
        assertRoundKeyStored(address(2), blsKey(address(2), 0));
        assertRoundKeyStored(address(3), blsKey(address(3), 0));
    }

    function test_should_free_round_bls_public_keys_when_round_validators_decrease() public {
        register(address(1));
        register(address(2));
        register(address(3));
        consensus.calculateRoundValidators(3);

        assertRoundKeyStored(address(1), blsKey(address(1), 0));
        assertRoundKeyStored(address(2), blsKey(address(2), 0));
        assertRoundKeyStored(address(3), blsKey(address(3), 0));

        moveVoteTo(address(3));
        consensus.calculateRoundValidators(1);

        assertRoundKeyFreed(address(1));
        assertRoundKeyFreed(address(2));
        assertRoundKeyStored(address(3), blsKey(address(3), 0));

        consensus.calculateRoundValidators(3);

        assertRoundKeyStored(address(1), blsKey(address(1), 0));
        assertRoundKeyStored(address(2), blsKey(address(2), 0));
        assertRoundKeyStored(address(3), blsKey(address(3), 0));
    }

    function test_should_keep_round_bls_public_keys_bounded_to_round() public {
        for (uint160 i = 1; i <= 5; i++) {
            register(address(i));
        }

        for (uint160 round = 0; round < 10; round++) {
            moveVoteTo(address(round % 5 + 1));
            consensus.calculateRoundValidators(2);

            ConsensusV1.Validator[] memory validators = consensus.getRoundValidators();
            for (uint160 i = 1; i <= 5; i++) {
                address addr = address(i);
                if (addr == validators[0].addr || addr == validators[1].addr) {
                    assertRoundKeyStored(addr, blsKey(addr, 0));
                } else {
                    assertRoundKeyFreed(addr);
                }
            }
        }
    }

    function test_should_not_store_round_bls_public_key_of_validator_outside_round() public {
        register(address(1));
        register(address(2));
        moveVoteTo(address(1));
        consensus.calculateRoundValidators(1);

        update(address(2), 1);

        assertRoundKeyFreed(address(2));

        moveVoteTo(address(2));
        consensus.calculateRoundValidators(1);

        assertEq(roundKeyOf(address(2)), blsKey(address(2), 1));
        assertRoundKeyStored(address(2), blsKey(address(2), 1));
    }

    function testFuzz_should_serve_selection_time_keys_and_free_all_others(uint256 seed) public {
        uint256 count = 12;
        uint256[] memory versions = new uint256[](count + 1);
        bool[] memory registered = new bool[](count + 1);
        bytes[] memory roundKeys = new bytes[](count + 1);

        for (uint256 index = 1; index <= count; index++) {
            uint256 choice = uint256(keccak256(abi.encode(seed, "import", index))) % 4;
            if (choice < 2) {
                consensus.addValidator(fuzzAccount(index), choice == 1);
                registered[index] = true;
            }
        }

        for (uint256 step = 0; step < 80; step++) {
            uint256 random = uint256(keccak256(abi.encode(seed, step)));
            uint256 index = (random >> 8) % count + 1;
            address addr = fuzzAccount(index);
            uint256 action = random % 6;

            if (action == 0) {
                if (!registered[index]) {
                    register(addr);
                    registered[index] = true;
                }
            } else if (action == 1) {
                if (registered[index]) {
                    versions[index]++;
                    update(addr, versions[index]);
                }
            } else if (action == 2) {
                address voter = address(uint160(0x9000 + (random >> 16) % 7));
                vm.deal(voter, ((random >> 24) % 1000) * 1 ether);
                address[] memory voters = new address[](1);
                voters[0] = voter;
                consensus.updateVoters(voters);
                vm.prank(voter);
                try consensus.vote(addr) {} catch {}
            } else if (action == 3) {
                vm.prank(addr);
                try consensus.resignValidator() {} catch {}
            } else {
                uint8 n = uint8((random >> 32) % (consensus.activeValidatorsCount() + 2) + 1);
                try consensus.calculateRoundValidators(n) {
                    roundKeys = new bytes[](count + 1);
                    ConsensusV1.Validator[] memory selected = consensus.getRoundValidators();
                    assertEq(selected.length, n);
                    for (uint256 i = 0; i < selected.length; i++) {
                        uint256 selectedIndex = fuzzIndex(selected[i].addr);
                        roundKeys[selectedIndex] = blsKey(selected[i].addr, versions[selectedIndex]);
                    }
                } catch {}
            }

            assertRoundKeys(roundKeys);
        }
    }
}
