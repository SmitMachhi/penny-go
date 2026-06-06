import assert from "node:assert/strict";
import test from "node:test";

import type { ProgramProfile } from "./domain/corpus-types.js";
import { filterAndRankPrograms } from "./domain/corpus-search.js";
import { textLooksLoanBacked } from "./domain/loan-filter.js";
import {
  appendOfficialBenefitScope,
  officialBenefitScopeFromMarkdown,
} from "./domain/official-benefit-scope.js";
import { parseJsonlPrograms } from "./services/corpus-load.js";

const ONTARIO_LOAN: ProgramProfile = {
  business_only: true,
  program_name: "Ontario low-interest financing guarantee",
  jurisdiction: "ontario",
  program_type: "financing",
  eligible_applicants: "Ontario manufacturers",
  eligible_projects: "",
  funding_amount: "Loan guarantee up to $1m",
  deadline_or_intake: "Rolling",
  status: "active",
  source_urls: ["https://example.com/o"],
};

const ONTARIO_HIRING: ProgramProfile = {
  business_only: true,
  program_name: "Ontario hiring and training subsidy",
  jurisdiction: "ontario",
  program_type: "wage subsidy",
  eligible_applicants: "SME hiring staff",
  eligible_projects: "Onboarding apprentices",
  funding_amount: "Non-repayable contribution",
  deadline_or_intake: "Rolling",
  status: "active",
  source_urls: ["https://example.com/grant"],
};

const FEDERAL_BROADBAND: ProgramProfile = {
  business_only: true,
  program_name: "Federal rural broadband rollout",
  jurisdiction: "federal",
  program_type: "capital",
  eligible_applicants: "Rural ISPs",
  eligible_projects: "Fiber rollout",
  funding_amount: "Grant",
  deadline_or_intake: "Closed 2025",
  status: "closed",
  source_urls: ["https://example.com/f"],
};

const ATLANTIC_REPAYABLE: ProgramProfile = {
  business_only: true,
  program_name: "ACOA Business Development Program",
  jurisdiction: "nova-scotia",
  program_type: "business financing",
  eligible_applicants: "Atlantic startups",
  eligible_projects: "Startup capital costs",
  funding_amount: "Interest-free unsecured financing as repayable contributions",
  deadline_or_intake: "Rolling",
  status: "active",
  source_urls: ["https://example.com/acoa"],
};

test("excludes loan-like rows and prefers keyword matches within jurisdiction", () => {
  const matches = filterAndRankPrograms([ONTARIO_LOAN, ONTARIO_HIRING, FEDERAL_BROADBAND], {
    jurisdiction: "ontario",
    include_federal: false,
    keywords: ["hiring", "saas"],
  });

  assert.equal(matches.length >= 1, true);
  assert.equal(matches[0]?.program_name, ONTARIO_HIRING.program_name);
});

test("excludes repayable contribution and financing rows", () => {
  const matches = filterAndRankPrograms([ATLANTIC_REPAYABLE, ONTARIO_HIRING], {
    jurisdiction: "nova-scotia",
    include_federal: false,
    keywords: ["startup", "capital"],
  });

  assert.equal(matches.some((match) => match.program_name === ATLANTIC_REPAYABLE.program_name), false);
});

test("include_federal admits federal jurisdiction when provincial filter applied", () => {
  const noFederal = filterAndRankPrograms([FEDERAL_BROADBAND], {
    jurisdiction: "ontario",
    include_federal: false,
  });
  assert.equal(noFederal.length, 0);

  const withFederal = filterAndRankPrograms([FEDERAL_BROADBAND], {
    jurisdiction: "ontario",
    include_federal: true,
  });
  assert.equal(withFederal.length, 1);
  assert.equal(withFederal[0]?.jurisdiction, "federal");
});

test("loan filter stays stable across consecutive corpus rows", () => {
  const loanBlob = ["Loan guarantee up to $1m", "Ontario low-interest financing"];
  assert.equal(textLooksLoanBacked(loanBlob), true);
  assert.equal(textLooksLoanBacked(loanBlob), true);
  assert.equal(textLooksLoanBacked(loanBlob), true);
});

test("official benefit scope flags repayable official pages", () => {
  const scope = officialBenefitScopeFromMarkdown(
    "This program provides interest-free unsecured financing as repayable contributions.",
  );
  assert.equal(scope.scope_verdict, "ruled_out");
});

test("official benefit scope preserves non-repayable contribution pages", () => {
  const scope = officialBenefitScopeFromMarkdown(
    "This program provides a non-repayable contribution for eligible equipment.",
  );
  assert.equal(scope.scope_verdict, "unknown");
});

test("official benefit scope ignores page chrome loan links", () => {
  const scope = officialBenefitScopeFromMarkdown(
    [
      "# Export Development Program",
      "[Export Development Program](https://example.ca/export) [Business Loan Program](https://example.ca/loans)",
      "The program reimburses Manitoba businesses for eligible market research and trade show costs.",
    ].join("\n"),
  );
  assert.equal(scope.scope_verdict, "unknown");
});

test("official benefit scope returns matched veto evidence", () => {
  const scope = officialBenefitScopeFromMarkdown(
    "Funding is provided as an interest-free repayable contribution for eligible expansion costs.",
  );
  assert.equal(scope.scope_verdict, "ruled_out");
  assert.equal(scope.matched_text, "Funding is provided as an interest-free repayable contribution for eligible expansion costs.");
  assert.equal(scope.matched_term, "repayable contribution");
});

test("appendOfficialBenefitScope annotates successful source reads", () => {
  const payload = appendOfficialBenefitScope({
    success: true,
    markdown: "Funding is provided as a repayable contribution.",
  });
  assert.equal(typeof payload, "object");
  assert.notEqual(payload, null);
  assert.equal(readScopeVerdict(payload), "ruled_out");
});

function readScopeVerdict(payload: unknown): string | undefined {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return undefined;
  }
  const benefitScope = Object.getOwnPropertyDescriptor(payload, "benefit_scope")?.value;
  if (typeof benefitScope !== "object" || benefitScope === null || Array.isArray(benefitScope)) {
    return undefined;
  }
  const verdict = Object.getOwnPropertyDescriptor(benefitScope, "scope_verdict")?.value;
  return typeof verdict === "string" ? verdict : undefined;
}

test("parseJsonlPrograms skips malformed lines", () => {
  const raw = [
    JSON.stringify(ONTARIO_HIRING),
    "{not valid json",
    JSON.stringify(FEDERAL_BROADBAND),
  ].join("\n");
  const programs = parseJsonlPrograms(raw);
  assert.equal(programs.length, 2);
  assert.equal(programs[0]?.program_name, ONTARIO_HIRING.program_name);
  assert.equal(programs[1]?.program_name, FEDERAL_BROADBAND.program_name);
});
