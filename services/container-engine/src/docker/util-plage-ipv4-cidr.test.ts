import { describe, expect, it } from "vitest";
import {
  cidrIpv4VersIntervalle,
  intervallesIpv4Uint32Chevauchent,
} from "@kidopanel/database";

describe("util-plage-ipv4-cidr", () => {
  it("détecte le chevauchement entre deux blocs qui se superposent", () => {
    const a = cidrIpv4VersIntervalle("10.0.0.0/16");
    const b = cidrIpv4VersIntervalle("10.0.128.0/24");
    expect(a).toBeDefined();
    expect(b).toBeDefined();
    expect(intervallesIpv4Uint32Chevauchent(a!, b!)).toBe(true);
  });

  it("ne détecte pas de chevauchement entre deux blocs disjoints", () => {
    const a = cidrIpv4VersIntervalle("10.1.0.0/24");
    const b = cidrIpv4VersIntervalle("10.2.0.0/24");
    expect(intervallesIpv4Uint32Chevauchent(a!, b!)).toBe(false);
  });
});
