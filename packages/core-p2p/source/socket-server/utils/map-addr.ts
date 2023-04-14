import { process } from "ipaddr.js";

export const mapAddr = (addr: string): string => process(addr).toString();
