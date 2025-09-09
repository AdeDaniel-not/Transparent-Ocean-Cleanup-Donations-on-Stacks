import { describe, it, expect, beforeEach } from "vitest";
import { stringUtf8CV, uintCV } from "@stacks/transactions";

const ERR_NOT_AUTHORIZED = 100;
const ERR_INVALID_MAX_MEMBERS = 101;
const ERR_INVALID_CONTRIB_AMOUNT = 102;
const ERR_INVALID_CYCLE_DUR = 103;
const ERR_INVALID_PENALTY_RATE = 104;
const ERR_INVALID_VOTING_THRESHOLD = 105;
const ERR_GROUP_ALREADY_EXISTS = 106;
const ERR_GROUP_NOT_FOUND = 107;
const ERR_INVALID_GROUP_TYPE = 115;
const ERR_INVALID_INTEREST_RATE = 116;
const ERR_INVALID_GRACE_PERIOD = 117;
const ERR_INVALID_LOCATION = 118;
const ERR_INVALID_CURRENCY = 119;
const ERR_INVALID_MIN_CONTRIB = 110;
const ERR_INVALID_MAX_LOAN = 111;
const ERR_MAX_GROUPS_EXCEEDED = 114;
const ERR_INVALID_UPDATE_PARAM = 113;
const ERR_AUTHORITY_NOT_VERIFIED = 109;

interface Group {
  name: string;
  maxMembers: number;
  contribAmount: number;
  cycleDuration: number;
  penaltyRate: number;
  votingThreshold: number;
  timestamp: number;
  creator: string;
  groupType: string;
  interestRate: number;
  gracePeriod: number;
  location: string;
  currency: string;
  status: boolean;
  minContrib: number;
  maxLoan: number;
}

interface GroupUpdate {
  updateName: string;
  updateMaxMembers: number;
  updateContribAmount: number;
  updateTimestamp: number;
  updater: string;
}

interface Result<T> {
  ok: boolean;
  value: T;
}

class GroupFactoryMock {
  state: {
    nextGroupId: number;
    maxGroups: number;
    creationFee: number;
    authorityContract: string | null;
    groups: Map<number, Group>;
    groupUpdates: Map<number, GroupUpdate>;
    groupsByName: Map<string, number>;
  } = {
    nextGroupId: 0,
    maxGroups: 1000,
    creationFee: 1000,
    authorityContract: null,
    groups: new Map(),
    groupUpdates: new Map(),
    groupsByName: new Map(),
  };
  blockHeight: number = 0;
  caller: string = "ST1TEST";
  authorities: Set<string> = new Set(["ST1TEST"]);
  stxTransfers: Array<{ amount: number; from: string; to: string | null }> = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      nextGroupId: 0,
      maxGroups: 1000,
      creationFee: 1000,
      authorityContract: null,
      groups: new Map(),
      groupUpdates: new Map(),
      groupsByName: new Map(),
    };
    this.blockHeight = 0;
    this.caller = "ST1TEST";
    this.authorities = new Set(["ST1TEST"]);
    this.stxTransfers = [];
  }

  isVerifiedAuthority(principal: string): Result<boolean> {
    return { ok: true, value: this.authorities.has(principal) };
  }

  setAuthorityContract(contractPrincipal: string): Result<boolean> {
    if (contractPrincipal === "SP000000000000000000002Q6VF78") {
      return { ok: false, value: false };
    }
    if (this.state.authorityContract !== null) {
      return { ok: false, value: false };
    }
    this.state.authorityContract = contractPrincipal;
    return { ok: true, value: true };
  }

  setCreationFee(newFee: number): Result<boolean> {
    if (!this.state.authorityContract) return { ok: false, value: false };
    this.state.creationFee = newFee;
    return { ok: true, value: true };
  }

  createGroup(
    name: string,
    maxMembers: number,
    contribAmount: number,
    cycleDuration: number,
    penaltyRate: number,
    votingThreshold: number,
    groupType: string,
    interestRate: number,
    gracePeriod: number,
    location: string,
    currency: string,
    minContrib: number,
    maxLoan: number
  ): Result<number> {
    if (this.state.nextGroupId >= this.state.maxGroups) return { ok: false, value: ERR_MAX_GROUPS_EXCEEDED };
    if (!name || name.length > 100) return { ok: false, value: ERR_INVALID_UPDATE_PARAM };
    if (maxMembers <= 0 || maxMembers > 50) return { ok: false, value: ERR_INVALID_MAX_MEMBERS };
    if (contribAmount <= 0) return { ok: false, value: ERR_INVALID_CONTRIB_AMOUNT };
    if (cycleDuration <= 0) return { ok: false, value: ERR_INVALID_CYCLE_DUR };
    if (penaltyRate > 100) return { ok: false, value: ERR_INVALID_PENALTY_RATE };
    if (votingThreshold <= 0 || votingThreshold > 100) return { ok: false, value: ERR_INVALID_VOTING_THRESHOLD };
    if (!["rural", "urban", "community"].includes(groupType)) return { ok: false, value: ERR_INVALID_GROUP_TYPE };
    if (interestRate > 20) return { ok: false, value: ERR_INVALID_INTEREST_RATE };
    if (gracePeriod > 30) return { ok: false, value: ERR_INVALID_GRACE_PERIOD };
    if (!location || location.length > 100) return { ok: false, value: ERR_INVALID_LOCATION };
    if (!["STX", "USD", "BTC"].includes(currency)) return { ok: false, value: ERR_INVALID_CURRENCY };
    if (minContrib <= 0) return { ok: false, value: ERR_INVALID_MIN_CONTRIB };
    if (maxLoan <= 0) return { ok: false, value: ERR_INVALID_MAX_LOAN };
    if (!this.isVerifiedAuthority(this.caller).value) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (this.state.groupsByName.has(name)) return { ok: false, value: ERR_GROUP_ALREADY_EXISTS };
    if (!this.state.authorityContract) return { ok: false, value: ERR_AUTHORITY_NOT_VERIFIED };

    this.stxTransfers.push({ amount: this.state.creationFee, from: this.caller, to: this.state.authorityContract });

    const id = this.state.nextGroupId;
    const group: Group = {
      name,
      maxMembers,
      contribAmount,
      cycleDuration,
      penaltyRate,
      votingThreshold,
      timestamp: this.blockHeight,
      creator: this.caller,
      groupType,
      interestRate,
      gracePeriod,
      location,
      currency,
      status: true,
      minContrib,
      maxLoan,
    };
    this.state.groups.set(id, group);
    this.state.groupsByName.set(name, id);
    this.state.nextGroupId++;
    return { ok: true, value: id };
  }

  getGroup(id: number): Group | null {
    return this.state.groups.get(id) || null;
  }

  updateGroup(id: number, updateName: string, updateMaxMembers: number, updateContribAmount: number): Result<boolean> {
    const group = this.state.groups.get(id);
    if (!group) return { ok: false, value: false };
    if (group.creator !== this.caller) return { ok: false, value: false };
    if (!updateName || updateName.length > 100) return { ok: false, value: false };
    if (updateMaxMembers <= 0 || updateMaxMembers > 50) return { ok: false, value: false };
    if (updateContribAmount <= 0) return { ok: false, value: false };
    if (this.state.groupsByName.has(updateName) && this.state.groupsByName.get(updateName) !== id) {
      return { ok: false, value: false };
    }

    const updated: Group = {
      ...group,
      name: updateName,
      maxMembers: updateMaxMembers,
      contribAmount: updateContribAmount,
      timestamp: this.blockHeight,
    };
    this.state.groups.set(id, updated);
    this.state.groupsByName.delete(group.name);
    this.state.groupsByName.set(updateName, id);
    this.state.groupUpdates.set(id, {
      updateName,
      updateMaxMembers,
      updateContribAmount,
      updateTimestamp: this.blockHeight,
      updater: this.caller,
    });
    return { ok: true, value: true };
  }

  getGroupCount(): Result<number> {
    return { ok: true, value: this.state.nextGroupId };
  }

  checkGroupExistence(name: string): Result<boolean> {
    return { ok: true, value: this.state.groupsByName.has(name) };
  }
}

describe("GroupFactory", () => {
  let contract: GroupFactoryMock;

  beforeEach(() => {
    contract = new GroupFactoryMock();
    contract.reset();
  });

  it("creates a group successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.createGroup(
      "Alpha",
      10,
      100,
      30,
      5,
      50,
      "rural",
      10,
      7,
      "VillageX",
      "STX",
      50,
      1000
    );
    expect(result.ok).toBe(true);
    expect(result.value).toBe(0);

    const group = contract.getGroup(0);
    expect(group?.name).toBe("Alpha");
    expect(group?.maxMembers).toBe(10);
    expect(group?.contribAmount).toBe(100);
    expect(group?.cycleDuration).toBe(30);
    expect(group?.penaltyRate).toBe(5);
    expect(group?.votingThreshold).toBe(50);
    expect(group?.groupType).toBe("rural");
    expect(group?.interestRate).toBe(10);
    expect(group?.gracePeriod).toBe(7);
    expect(group?.location).toBe("VillageX");
    expect(group?.currency).toBe("STX");
    expect(group?.minContrib).toBe(50);
    expect(group?.maxLoan).toBe(1000);
    expect(contract.stxTransfers).toEqual([{ amount: 1000, from: "ST1TEST", to: "ST2TEST" }]);
  });

  it("rejects duplicate group names", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createGroup(
      "Alpha",
      10,
      100,
      30,
      5,
      50,
      "rural",
      10,
      7,
      "VillageX",
      "STX",
      50,
      1000
    );
    const result = contract.createGroup(
      "Alpha",
      20,
      200,
      60,
      10,
      60,
      "urban",
      15,
      14,
      "CityY",
      "USD",
      100,
      2000
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_GROUP_ALREADY_EXISTS);
  });

  it("rejects non-authorized caller", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.caller = "ST2FAKE";
    contract.authorities = new Set();
    const result = contract.createGroup(
      "Beta",
      10,
      100,
      30,
      5,
      50,
      "rural",
      10,
      7,
      "VillageX",
      "STX",
      50,
      1000
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });

  it("parses group name with Clarity", () => {
    const cv = stringUtf8CV("Gamma");
    expect(cv.value).toBe("Gamma");
  });

  it("rejects group creation without authority contract", () => {
    const result = contract.createGroup(
      "NoAuth",
      10,
      100,
      30,
      5,
      50,
      "rural",
      10,
      7,
      "VillageX",
      "STX",
      50,
      1000
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_AUTHORITY_NOT_VERIFIED);
  });

  it("rejects invalid max members", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.createGroup(
      "InvalidMembers",
      51,
      100,
      30,
      5,
      50,
      "rural",
      10,
      7,
      "VillageX",
      "STX",
      50,
      1000
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_MAX_MEMBERS);
  });

  it("rejects invalid contribution amount", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.createGroup(
      "InvalidContrib",
      10,
      0,
      30,
      5,
      50,
      "rural",
      10,
      7,
      "VillageX",
      "STX",
      50,
      1000
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_CONTRIB_AMOUNT);
  });

  it("rejects invalid group type", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.createGroup(
      "InvalidType",
      10,
      100,
      30,
      5,
      50,
      "invalid",
      10,
      7,
      "VillageX",
      "STX",
      50,
      1000
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_GROUP_TYPE);
  });

  it("updates a group successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createGroup(
      "OldGroup",
      10,
      100,
      30,
      5,
      50,
      "rural",
      10,
      7,
      "VillageX",
      "STX",
      50,
      1000
    );
    const result = contract.updateGroup(0, "NewGroup", 15, 200);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const group = contract.getGroup(0);
    expect(group?.name).toBe("NewGroup");
    expect(group?.maxMembers).toBe(15);
    expect(group?.contribAmount).toBe(200);
    const update = contract.state.groupUpdates.get(0);
    expect(update?.updateName).toBe("NewGroup");
    expect(update?.updateMaxMembers).toBe(15);
    expect(update?.updateContribAmount).toBe(200);
    expect(update?.updater).toBe("ST1TEST");
  });

  it("rejects update for non-existent group", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.updateGroup(99, "NewGroup", 15, 200);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("rejects update by non-creator", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createGroup(
      "TestGroup",
      10,
      100,
      30,
      5,
      50,
      "rural",
      10,
      7,
      "VillageX",
      "STX",
      50,
      1000
    );
    contract.caller = "ST3FAKE";
    const result = contract.updateGroup(0, "NewGroup", 15, 200);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("sets creation fee successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.setCreationFee(2000);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.creationFee).toBe(2000);
    contract.createGroup(
      "TestGroup",
      10,
      100,
      30,
      5,
      50,
      "rural",
      10,
      7,
      "VillageX",
      "STX",
      50,
      1000
    );
    expect(contract.stxTransfers).toEqual([{ amount: 2000, from: "ST1TEST", to: "ST2TEST" }]);
  });

  it("rejects creation fee change without authority contract", () => {
    const result = contract.setCreationFee(2000);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("returns correct group count", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createGroup(
      "Group1",
      10,
      100,
      30,
      5,
      50,
      "rural",
      10,
      7,
      "VillageX",
      "STX",
      50,
      1000
    );
    contract.createGroup(
      "Group2",
      15,
      200,
      60,
      10,
      60,
      "urban",
      15,
      14,
      "CityY",
      "USD",
      100,
      2000
    );
    const result = contract.getGroupCount();
    expect(result.ok).toBe(true);
    expect(result.value).toBe(2);
  });

  it("checks group existence correctly", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createGroup(
      "TestGroup",
      10,
      100,
      30,
      5,
      50,
      "rural",
      10,
      7,
      "VillageX",
      "STX",
      50,
      1000
    );
    const result = contract.checkGroupExistence("TestGroup");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const result2 = contract.checkGroupExistence("NonExistent");
    expect(result2.ok).toBe(true);
    expect(result2.value).toBe(false);
  });

  it("parses group parameters with Clarity types", () => {
    const name = stringUtf8CV("TestGroup");
    const maxMembers = uintCV(10);
    const contribAmount = uintCV(100);
    expect(name.value).toBe("TestGroup");
    expect(maxMembers.value).toEqual(BigInt(10));
    expect(contribAmount.value).toEqual(BigInt(100));
  });

  it("rejects group creation with empty name", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.createGroup(
      "",
      10,
      100,
      30,
      5,
      50,
      "rural",
      10,
      7,
      "VillageX",
      "STX",
      50,
      1000
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_UPDATE_PARAM);
  });

  it("rejects group creation with max groups exceeded", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.state.maxGroups = 1;
    contract.createGroup(
      "Group1",
      10,
      100,
      30,
      5,
      50,
      "rural",
      10,
      7,
      "VillageX",
      "STX",
      50,
      1000
    );
    const result = contract.createGroup(
      "Group2",
      15,
      200,
      60,
      10,
      60,
      "urban",
      15,
      14,
      "CityY",
      "USD",
      100,
      2000
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_MAX_GROUPS_EXCEEDED);
  });

  it("sets authority contract successfully", () => {
    const result = contract.setAuthorityContract("ST2TEST");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.authorityContract).toBe("ST2TEST");
  });

  it("rejects invalid authority contract", () => {
    const result = contract.setAuthorityContract("SP000000000000000000002Q6VF78");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });
});