// SPDX-License-Identifier: GNU GENERAL PUBLIC LICENSE
pragma solidity ^0.8.13;

import {Test, console} from "@forge-std/Test.sol";
import {
    UsernamesV1,
    CallerIsOwner,
    CallerIsNotOwner,
    InvalidUsername,
    TakenUsername,
    UsernameNotRegistered,
    UsernameRegistered,
    UsernameResigned,
    User
} from "@contracts/usernames/UsernamesV1.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract UsernamesTest is Test {
    UsernamesV1 public usernames;

    function setUp() public {
        bytes memory data = abi.encode(UsernamesV1.initialize.selector);
        address proxy = address(new ERC1967Proxy(address(new UsernamesV1()), data));
        usernames = UsernamesV1(proxy);
    }

    function test_add_username_should_revert_if_not_owner() public {
        vm.startPrank(address(1));
        vm.expectRevert(CallerIsNotOwner.selector);
        usernames.addUsername(address(1), "test");
    }

    function test_add_username_should_revert_if_username_exist() public {
        usernames.addUsername(address(1), "test");

        vm.expectRevert(TakenUsername.selector);
        usernames.addUsername(address(2), "test");
    }

    function test_add_username_should_revert_if_username_is_empty_or_longer_than_20() public {
        vm.expectRevert(InvalidUsername.selector);
        usernames.addUsername(address(1), "");
        vm.expectRevert(InvalidUsername.selector);
        usernames.addUsername(address(1), "000000000000000000000"); // 21 chars
    }

    function test_add_username_should_pass() public {
        // Verify usernames exists
        assertFalse(usernames.isUsernameRegistered("test"));
        assertFalse(usernames.isUsernameRegistered("te_st"));
        assertFalse(usernames.isUsernameRegistered("t_e_s_t"));
        assertFalse(usernames.isUsernameRegistered("0123456789"));
        assertFalse(usernames.isUsernameRegistered("abcdefghijeklmnopqrs"));
        assertFalse(usernames.isUsernameRegistered("tuvwxyz"));
        assertFalse(usernames.isUsernameRegistered("00000000000000000000")); // 20 chars
        // EXTRA
        assertFalse(usernames.isUsernameRegistered("TEST"));
        assertFalse(usernames.isUsernameRegistered("-.%!@"));

        // Register usernames
        usernames.addUsername(address(1), "test");
        usernames.addUsername(address(2), "te_st");
        usernames.addUsername(address(3), "t_e_s_t");
        usernames.addUsername(address(4), "0123456789");
        usernames.addUsername(address(5), "abcdefghijeklmnopqrs");
        usernames.addUsername(address(6), "tuvwxyz");
        usernames.addUsername(address(7), "00000000000000000000"); // 20 chars
        // EXTRA
        usernames.addUsername(address(8), "TEST");
        usernames.addUsername(address(9), "-.%!@");

        // Verify usernames exists
        assertEq(usernames.getUsername(address(1)), "test");
        assertEq(usernames.getUsername(address(2)), "te_st");
        assertEq(usernames.getUsername(address(3)), "t_e_s_t");
        assertEq(usernames.getUsername(address(4)), "0123456789");
        assertEq(usernames.getUsername(address(5)), "abcdefghijeklmnopqrs");
        assertEq(usernames.getUsername(address(6)), "tuvwxyz");
        assertEq(usernames.getUsername(address(7)), "00000000000000000000"); // 20 chars
        // EXTRA
        assertEq(usernames.getUsername(address(8)), "TEST");
        assertEq(usernames.getUsername(address(9)), "-.%!@");

        assertTrue(usernames.isUsernameRegistered("test"));
        assertTrue(usernames.isUsernameRegistered("te_st"));
        assertTrue(usernames.isUsernameRegistered("t_e_s_t"));
        assertTrue(usernames.isUsernameRegistered("0123456789"));
        assertTrue(usernames.isUsernameRegistered("abcdefghijeklmnopqrs"));
        assertTrue(usernames.isUsernameRegistered("tuvwxyz"));
        assertTrue(usernames.isUsernameRegistered("00000000000000000000")); // 20 chars
        // EXTRA
        assertTrue(usernames.isUsernameRegistered("TEST"));
        assertTrue(usernames.isUsernameRegistered("-.%!@"));
    }

    function test_add_username_should_emit() public {
        vm.expectEmit(address(usernames));
        emit UsernameRegistered(address(1), "test", "");
        usernames.addUsername(address(1), "test");

        vm.expectEmit(address(usernames));
        emit UsernameRegistered(address(1), "test2", "test");
        usernames.addUsername(address(1), "test2");
    }

    function test_add_username_should_allow_update() public {
        usernames.addUsername(address(1), "test");
        assertEq(usernames.getUsername(address(1)), "test");
        assertTrue(usernames.isUsernameRegistered("test"));

        usernames.addUsername(address(1), "test2");
        assertEq(usernames.getUsername(address(1)), "test2");

        assertFalse(usernames.isUsernameRegistered("test"));
        assertTrue(usernames.isUsernameRegistered("test2"));

        // Prevent user to use new username
        vm.expectRevert(TakenUsername.selector);
        usernames.addUsername(address(2), "test2");

        // Allow user to update to reuse old username
        usernames.addUsername(address(2), "test");
        assertEq(usernames.getUsername(address(2)), "test");

        assertTrue(usernames.isUsernameRegistered("test"));
        assertTrue(usernames.isUsernameRegistered("test2"));
    }

    function test_get_username_should_return_empty_string() public view {
        assertEq(usernames.getUsername(address(1)), "");
    }

    function test_register_username_should_pass() public {
        // Verify usernames exists
        assertFalse(usernames.isUsernameRegistered("test"));
        assertFalse(usernames.isUsernameRegistered("te_st"));
        assertFalse(usernames.isUsernameRegistered("t_e_s_t"));
        assertFalse(usernames.isUsernameRegistered("0123456789"));
        assertFalse(usernames.isUsernameRegistered("abcdefghijeklmnopqrs"));
        assertFalse(usernames.isUsernameRegistered("tuvwxyz"));

        // Register usernames
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

        // Verify usernames exists
        assertTrue(usernames.isUsernameRegistered("test"));
        assertTrue(usernames.isUsernameRegistered("te_st"));
        assertTrue(usernames.isUsernameRegistered("t_e_s_t"));
        assertTrue(usernames.isUsernameRegistered("0123456789"));
        assertTrue(usernames.isUsernameRegistered("abcdefghijeklmnopqrs"));
        assertTrue(usernames.isUsernameRegistered("tuvwxyz"));
    }

    function test_register_username_should_emit() public {
        vm.startPrank(address(1));
        vm.expectEmit(address(usernames));
        emit UsernameRegistered(address(1), "test", "");
        usernames.registerUsername("test");

        vm.expectEmit(address(usernames));
        emit UsernameRegistered(address(1), "test2", "test");
        usernames.registerUsername("test2");
    }

    function test_register_username_should_allow_update() public {
        vm.startPrank(address(1));
        usernames.registerUsername("test");
        assertEq(usernames.getUsername(address(1)), "test");
        assertTrue(usernames.isUsernameRegistered("test"));

        usernames.registerUsername("test2");
        assertEq(usernames.getUsername(address(1)), "test2");

        assertFalse(usernames.isUsernameRegistered("test"));
        assertTrue(usernames.isUsernameRegistered("test2"));

        // Prevent user to use new username
        vm.startPrank(address(2));
        vm.expectRevert(TakenUsername.selector);
        usernames.registerUsername("test2");

        // Allow user to update to reuse old username
        vm.startPrank(address(2));
        usernames.registerUsername("test");
        assertEq(usernames.getUsername(address(2)), "test");

        assertTrue(usernames.isUsernameRegistered("test"));
        assertTrue(usernames.isUsernameRegistered("test2"));
    }

    function test_register_username_revert_if_owner() public {
        vm.expectRevert(CallerIsOwner.selector);
        usernames.registerUsername("test");
    }

    function test_register_username_revert_if_empty() public {
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

    function test_register_username_revert_if_greater_than_20() public {
        vm.startPrank(address(1));
        vm.expectRevert(InvalidUsername.selector);
        usernames.registerUsername("000000000000000000000"); // 20 chars
        vm.expectRevert(InvalidUsername.selector);
        usernames.registerUsername("0000000000000000000000"); // 21 chars
        vm.expectRevert(InvalidUsername.selector);
        usernames.registerUsername("00000000000000000000000"); // 22 chars
    }

    function test_register_username_revert_if_starts_or_end_with_underscore() public {
        vm.startPrank(address(1));
        vm.expectRevert(InvalidUsername.selector);
        usernames.registerUsername("_test");
        vm.expectRevert(InvalidUsername.selector);
        usernames.registerUsername("test_");
    }

    function test_register_username_revert_if_contains_2_consecutive_underscores() public {
        vm.startPrank(address(1));
        vm.expectRevert(InvalidUsername.selector);
        usernames.registerUsername("te__st");
    }

    function test_register_username_revert_if_contains_uppercase_charactes() public {
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

    function test_register_username_revert_if_contains_special_characters() public {
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

    function test_resign_username_should_pass() public {
        // Test
        address addr = address(1);
        vm.startPrank(addr);
        assertEq(usernames.getUsername(addr), "");
        assertFalse(usernames.isUsernameRegistered("test"));

        // Register
        usernames.registerUsername("test");
        assertEq(usernames.getUsername(addr), "test");
        assertTrue(usernames.isUsernameRegistered("test"));

        // Resign
        vm.expectEmit(address(usernames));
        emit UsernameResigned(addr, "test");
        usernames.resignUsername();
        assertEq(usernames.getUsername(addr), "");
        assertFalse(usernames.isUsernameRegistered("test"));
    }

    function test_resign_username_should_revert_if_not_registered() public {
        // Test
        address addr = address(1);
        vm.startPrank(addr);
        vm.expectRevert(UsernameNotRegistered.selector);
        usernames.resignUsername();
    }

    function test_is_username_valid() public view {
        assertTrue(usernames.isUsernameValid("test"));
        assertTrue(usernames.isUsernameValid("te_st"));
        assertTrue(usernames.isUsernameValid("t_e_s_t"));
        assertTrue(usernames.isUsernameValid("0123456789"));
        assertTrue(usernames.isUsernameValid("abcdefghijeklmnopqrs"));
        assertTrue(usernames.isUsernameValid("tuvwxyz"));

        assertFalse(usernames.isUsernameValid("_test"));
        assertFalse(usernames.isUsernameValid("test_"));
        assertFalse(usernames.isUsernameValid("te__st"));
        assertFalse(usernames.isUsernameValid("000000000000000000000")); // 20 chars

        string memory characters = "ABCDEDGHIJKLMNOPQRSTUVWXYZ!@#$%^&*()+{}|:\"<>?`-=[]\\;',./";
        bytes memory b = bytes(characters);

        for (uint256 i = 0; i < b.length; i++) {
            bytes memory c = new bytes(3);
            c[0] = 0x61; // a
            c[1] = b[i];
            c[2] = 0x61; // a

            assertFalse(usernames.isUsernameValid(string(c)));
        }
    }

    function test_is_username_registered_should_work_with_any_string() public view {
        assertFalse(usernames.isUsernameRegistered(""));
        assertFalse(usernames.isUsernameRegistered("abcd"));
        assertFalse(usernames.isUsernameRegistered("ABCD"));
        assertFalse(usernames.isUsernameRegistered("!@#$%^&*()+{}|:\"<>?`-=[]\\;',./"));
    }

    function test_version_should_return_1() public view {
        assertEq(usernames.version(), 1);
    }

    function test_get_usernames_should_pass() public {
        address[] memory addresses = new address[](9);
        for (uint256 i = 0; i < 9; i++) {
            addresses[i] = address(uint160(i + 1));
        }

        assertEq(usernames.getUsernames(addresses).length, 0);

        usernames.addUsername(address(1), "test1");
        usernames.addUsername(address(2), "test2");
        usernames.addUsername(address(3), "test3");

        User[] memory users = usernames.getUsernames(addresses);
        assertEq(users.length, 3);
        assertEq(users[0].addr, address(1));
        assertEq(users[0].username, "test1");
        assertEq(users[1].addr, address(2));
        assertEq(users[1].username, "test2");
        assertEq(users[2].addr, address(3));
        assertEq(users[2].username, "test3");
    }
}
