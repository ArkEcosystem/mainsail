// SPDX-License-Identifier: GNU GENERAL PUBLIC LICENSE
pragma solidity ^0.8.13;

import {Test, console} from "@forge-std/Test.sol";
import {UsernamesV1, CallerIsOwner, InvalidUsername, TakenUsername} from "@contracts/usernames/UsernamesV1.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract UsernamesTest is Test {
    UsernamesV1 public usernames;

    function setUp() public {
        bytes memory data = abi.encode(UsernamesV1.initialize.selector);
        address proxy = address(new ERC1967Proxy(address(new UsernamesV1()), data));
        usernames = UsernamesV1(proxy);
    }

    function test_get_username_should_return_empty_string() public view {
        assertEq(usernames.getUsername(address(1)), "");
    }

    function test_register_username_should_pass() public {
        vm.startPrank(address(1));
        usernames.registerUsername("test");
        assertEq(usernames.getUsername(address(1)), "test");

        vm.startPrank(address(2));
        usernames.registerUsername("te_st");
        assertEq(usernames.getUsername(address(2)), "te_st");

        vm.startPrank(address(3));
        usernames.registerUsername("t_e_s_t");
        assertEq(usernames.getUsername(address(3)), "t_e_s_t");

        vm.startPrank(address(4));
        usernames.registerUsername("0123456789");
        assertEq(usernames.getUsername(address(4)), "0123456789");

        vm.startPrank(address(5));
        usernames.registerUsername("abcdefghijeklmnopqrs");
        assertEq(usernames.getUsername(address(5)), "abcdefghijeklmnopqrs");

        vm.startPrank(address(6));
        usernames.registerUsername("tuvwxyz");
        assertEq(usernames.getUsername(address(6)), "tuvwxyz");
    }

    function test_register_username_should_allow_update() public {
        vm.startPrank(address(1));
        usernames.registerUsername("test");
        assertEq(usernames.getUsername(address(1)), "test");

        usernames.registerUsername("test2");
        assertEq(usernames.getUsername(address(1)), "test2");

        // Prevent user to use new username
        vm.startPrank(address(2));
        vm.expectRevert(TakenUsername.selector);
        usernames.registerUsername("test2");

        // Allow user to update to reuse old username
        vm.startPrank(address(2));
        usernames.registerUsername("test");
        assertEq(usernames.getUsername(address(2)), "test");
    }

    function test_register_username_rever_if_owner() public {
        vm.expectRevert(CallerIsOwner.selector);
        usernames.registerUsername("test");
    }

    function test_register_username_rever_if_empty() public {
        vm.startPrank(address(1));
        vm.expectRevert(InvalidUsername.selector);
        usernames.registerUsername("");
    }

    function test_register_username_revert_if_taken() public {
        vm.startPrank(address(1));
        usernames.registerUsername("test");

        vm.startPrank(address(2));
        vm.expectRevert(TakenUsername.selector);
        usernames.registerUsername("test");
    }

    function test_register_username_rever_if_greater_than_20() public {
        vm.startPrank(address(1));
        vm.expectRevert(InvalidUsername.selector);
        usernames.registerUsername("000000000000000000000"); // 20 chars
        vm.expectRevert(InvalidUsername.selector);
        usernames.registerUsername("0000000000000000000000"); // 21 chars
        vm.expectRevert(InvalidUsername.selector);
        usernames.registerUsername("00000000000000000000000"); // 22 chars
    }

    function test_register_username_rever_if_starts_or_end_with_underscore() public {
        vm.startPrank(address(1));
        vm.expectRevert(InvalidUsername.selector);
        usernames.registerUsername("_test");
        vm.expectRevert(InvalidUsername.selector);
        usernames.registerUsername("test_");
    }

    function test_register_username_rever_if_contains_2_consecutive_underscores() public {
        vm.startPrank(address(1));
        vm.expectRevert(InvalidUsername.selector);
        usernames.registerUsername("te__st");
    }

    function test_register_username_rever_if_contains_uppercase_charactes() public {
        string memory characters = "ABCDEDGHIJKLMNOPQRSTUVWXYZ";
        bytes memory b = bytes(characters);

        for (uint256 i = 0; i < b.length; i++) {
            bytes memory c = new bytes(3);
            c[0] = 0x61; // a
            c[1] = b[i];
            c[2] = 0x61; // a

            vm.startPrank(address(uint160(i)));
            vm.expectRevert(InvalidUsername.selector);
            usernames.registerUsername(string(c));
        }
    }

    function test_register_username_rever_if_contains_special_characters() public {
        string memory characters = "!@#$%^&*()+{}|:\"<>?`-=[]\\;',./";
        bytes memory b = bytes(characters);

        for (uint256 i = 0; i < b.length; i++) {
            bytes memory c = new bytes(3);
            c[0] = 0x61; // a
            c[1] = b[i];
            c[2] = 0x61; // a

            vm.startPrank(address(uint160(i)));
            vm.expectRevert(InvalidUsername.selector);
            usernames.registerUsername(string(c));
        }
    }
}
