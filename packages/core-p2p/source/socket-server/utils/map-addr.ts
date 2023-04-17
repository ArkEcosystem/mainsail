import ipaddr from "ipaddr.js";

export const mapAddr = (addr: string): string => ipaddr.process(addr).toString();
