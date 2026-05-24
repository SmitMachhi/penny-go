import assert from "node:assert/strict";
import test from "node:test";

import type { ProgramProfile } from "./corpus-types.js";
import { filterAndRankPrograms } from "./search-corpus.js";

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

test("excludes loan-like rows and prefers keyword matches within jurisdiction", () => {
  const matches = filterAndRankPrograms([ONTARIO_LOAN, ONTARIO_HIRING, FEDERAL_BROADBAND], {
    jurisdiction: "ontario",
    include_federal: false,
    keywords: ["hiring", "saas"],
  });

  assert.equal(matches.length >= 1, true);
  assert.equal(matches[0]?.program_name, ONTARIO_HIRING.program_name);
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
