# Funding Curation Notes

## 2026-05-23 First Batch

- Exa raw source rows: 180.
- Normalized accepted source rows after duplicate/non-official triage: 178.
- Normalized rejected source rows: 2 duplicate URLs.
- The deterministic keyword gate was removed after it falsely rejected French Quebec pages and useful official index pages.
- First verified profile batch focuses on high-confidence official source pages where the page itself is a program or tax-credit source.
- Browser harness verified the Ontario Job Grant page and added amount, applicant, application timing, and eligibility details.
- Browser harness could not render one long Canada.ca Clean Technology ITC URL under the default engine; Exa official-page extraction remains the evidence for that profile pending browser fallback tuning.

## Coverage Gaps

- Quebec needs deeper French and English discovery.
- Nunavut results are mostly reports/plans and need browser-backed verification.
- Federal clean economy ITCs need separate canonical profiles for CCUS, clean hydrogen, clean technology, clean technology manufacturing, clean electricity, and related labour/compliance rules.
- Many provincial entries still have `unknown` amount/deadline fields and need browser-backed page review.

## Next Curation Pass

1. Complete federal ITC family.
2. Complete Ontario, Alberta, British Columbia, and Saskatchewan.
3. Add Quebec follow-up Exa queries in French and English.
4. Use `agent-browser` for Nunavut, PDFs, redirecting pages, and pages with thin Exa text.

## 2026-05-23 Second Batch

- Added follow-up Exa discovery for Quebec, Nunavut, clean economy ITCs, federal agriculture, ACOA, CanNor, BC tax credits, and Ontario tax credits.
- Raw source rows increased from 180 to 299.
- Normalized source rows increased from 178 to 265 after duplicate-only rejection.
- Quebec normalized source rows increased from 10 to 28.
- Added verified profiles for CCUS ITC, federal agriculture programs, ACOA programs, BC tax credits, Ontario BRITC, New Brunswick tax credits, Nova Scotia tax credits, and Quebec tax/innovation programs.

## 2026-05-23 Missing Jurisdiction Pass

- Added first verified profiles for Newfoundland and Labrador, Northwest Territories, Nunavut, Prince Edward Island, and Yukon.
- Nunavut curation used official Government of Nunavut PDF/form evidence because Exa normalized rows were mostly reports, business registration pages, and policy documents rather than clean program pages.
- Browser harness check used isolated session names after the default socket was stale; Yukon opened behind security verification, while one NWT browser command hung and was terminated. Exa official-page text remained the evidence for NWT profiles in this batch.
- Did not promote weak Nunavut annual-report or business-registration rows into program profiles.

## 2026-05-23 Federal Depth Pass

- Added federal profiles for CSBFP, Strategic Response Fund, NRC IRAP, CanExport SMEs, FedDev Ontario, PacifiCan, FedNor, RTRI, AgriInnovate, Advance Payments, Agricultural Clean Technology, Clean Fuels Fund, and AAFC Youth Employment and Skills Program.
- Captured 2026 status changes where material: Strategic Response Fund supersedes the former Strategic Innovation Fund framing; AAFC Youth Employment and Skills Program 2026-2027 intake closed on May 4, 2026; AgriInnovate is closed to applications but program authority continues to March 31, 2028.

## 2026-05-23 Provincial Breadth Pass

- Added high-confidence Alberta, Manitoba, Nova Scotia, and Ontario business profiles where official Exa text had enough program detail for amount/status/eligibility.
- Marked closed intakes explicitly instead of hiding them, so Penny can explain whether a program is currently actionable or useful for monitoring.

## 2026-05-23 Provincial Gap Pass

- Added official-source profiles for British Columbia, New Brunswick, Quebec, and Saskatchewan to reduce thin-jurisdiction gaps.
- Excluded individual-only prospector assistance from the curated business profile batch unless the source clearly targeted companies or business projects.
- Kept closed or future-launch programs with explicit status because they are useful for monitoring but not immediately actionable.

## 2026-05-23 Nunavut Reinforcement Pass

- Removed Nunavut Business Credit Corporation financing from the curated opportunity DB after the no-loans scope was tightened.
- Added Community Tourism and Cultural Industries Program from official Government of Nunavut PDF evidence.
- Kept individual-only Nunavut prospector assistance out of verified business profiles.

## 2026-05-23 Federal NRCan and NRC Gap Pass

- Added Critical Minerals Research, Development and Demonstration Program from current Canada.ca CMRDD and Wave 2 non-repayable contribution evidence.
- Added federal forestry and built-environment non-loan profiles: Green Construction Through Wood Demonstration Project Stream, Indigenous Forestry Initiative Contribution Funding, and Investments in Forest Industry Transformation Capital Investment Project Stream.
- Added NRC e-Auto Challenge Program as an intake-closed 2026 grant/contribution opportunity for eligible automotive supply-chain collaborators.
- Added NRC Low Carbon Built Environment Challenge Program as an intake-closed SME grant/contribution opportunity and tightened Regional Tariff Response Initiative evidence for non-repayable SME support up to $1 million.
- Rejected surfaced federal and provincial pages where the official source described repayable loans, conditionally repayable clean-fuels capital funding, non-business applicant-only funding, or generic advisory/index pages rather than a distinct non-loan business opportunity.

## 2026-05-23 Yukon and CleanBC Rebate Gap Pass

- Added Yukon Carbon Price Rebate for Businesses as a final-claim refundable business tax rebate for tax years ending March 31, 2025 or earlier.
- Added Yukon Medium and Heavy Duty Zero-Emission Commercial Vehicle Rebate as a business/organization rebate still claimable for eligible purchases made by March 31, 2026.
- Enriched CleanBC Go Electric Business and Organization Rebates with official Indigenous-business increased rebate evidence, including higher fleet, workplace charger, and public charger rebate levels.
- Excluded surfaced residential-only Yukon home energy rebates and New Brunswick residential electricity rebate pages from the business-only corpus.

## 2026-05-23 Alberta Media Fund Gap Pass

- Added Book Publishers Operating Grant, Magazine Publishers Operating Grant, and Music Organization Operating Grant from current Alberta Media Fund pages.
- Added Alberta Project Script Development Grant for incorporated Alberta screen producers and Cultural Industry Support Organizations Operating Grant for designated Alberta support organizations.
- Excluded the closed Cultural Industry Organizations Project Grant and did not duplicate Alberta Made Production Grant or Post-Production, Visual Effects and Digital Animation Grant, which were already represented.

## 2026-05-23 Saskatchewan Manufacturing Tax Gap Pass

- Added Saskatchewan Manufacturing and Processing Profits Tax Reduction as a distinct corporate tax-rate reduction separate from the already-profiled Manufacturing and Processing Investment Tax Credit.
- Excluded Manufacturing and Processing Exporter Tax Incentive from current opportunity profiles because the official page states the program ended December 31, 2023, with only unused 2023 credits claimable for certificate holders.

## 2026-05-23 Prince Edward Island Business Supports Gap Pass

- Added current Innovation PEI business-support profiles for Small Business Assistance, Strategic Improvement Assistance, Food Product Development Assistance, Rental Incentive Assistance, and Marketing Assistance.
- Treated older Professional Services Assistance and Web Presence Assistance forms as represented by the current Small Business Assistance page unless a fresh official page reopens them as standalone programs.
- Did not add the Export Enhancement and Diversification Fund as a current standalone profile because the official page says prior supports are now available through Export Trade Assistance or Marketing Assistance.

## 2026-05-23 New Brunswick Culture Business Gap Pass

- Added Book and Periodical Publishers Operational Assistance from the current GNB culture and heritage grant page after the old service-renderer page redirected to the updated source.
- Added Promotional Travel Assistance Program for New Brunswick-based film, television, and new media producers or production companies.
- Excluded Short Film Venture Program from business-only profiles because the current official page frames the applicant as emerging filmmakers and directs eligibility to film organizations rather than stating business applicants.

## 2026-05-23 Nunavut Film Business Gap Pass

- Added Nunavut Film Development Corporation production-company supports: Nunavut Spend Incentive Program, Creative Content Development Fund, Story Telling Fund, The Learning Fund, and Inuktut Versioning Fund for Existing Programs.
- Used the Government of Nunavut Film, Television and Digital Media Development Contribution Policy as the government mandate source for NFDC-backed funding.
- Excluded Market Endowment and Short Film Fund from business-only profiles for now because the current public descriptions are framed around individual producers or emerging filmmakers.

## 2026-05-23 Quebec Employer Subsidy Gap Pass

- Added Services Quebec employer wage-subsidy profiles for durable employment integration, PAIPNI, PRIIME, IPOP, and Un premier emploi pour toi.
- Added Subventions aux entreprises adaptees as a closed/watchlist wage-subsidy profile because the official page remains current but says the last project call ended May 28, 2021.
- Excluded PADAT tourism development pages from the non-loan corpus because the official Quebec source classifies the support as loans or loan guarantees.

## 2026-05-23 Federal Cluster Innovation Gap Pass

- Added Global Innovation Clusters Program as a federal non-repayable contribution umbrella where project calls are delivered through the five official clusters.
- Added NGen Advanced Manufacturing Homebuilding Challenge as a closed-current-intake homebuilding technology support delivered through the Global Innovation Clusters network.
- Kept RDII/RHII business-facing profiles out of the no-loan corpus because current official RDA pages describe business funding as repayable assistance.

## 2026-05-23 Federal Unknown Status Cleanup

- Updated PrairiesCan Jobs and Growth Fund in the Prairie provinces from unknown to closed-current-intake using the current official applicant guide.
- Updated ISED Technology Demonstration Program from unknown to closed-current-intake because the current Industrial Technologies Office page says the call for applications has closed.

## 2026-05-23 Alberta Business Eligibility Cleanup

- Tightened Alberta Agri-Processing Investment Tax Credit, Alberta Carbon Capture Incentive Program, Alberta Manufacturing Productivity Grant, and Investment and Growth Fund with current official amount and intake evidence.
- Removed Major Innovation Fund from the business-only corpus because the official page says only eligible Alberta post-secondary institutions may apply and hold funding, while industry partners are not eligible applicants.

## 2026-05-23 British Columbia Business Eligibility Cleanup

- Tightened B.C. Employer Training Grant, B.C. SR&ED Tax Credit, BC Manufacturing Jobs Fund, and Clean Industry Fund with current official amount and intake evidence.
- Removed Rural Economic Diversification and Infrastructure Program because the current official REDIP page frames eligibility around rural and Indigenous communities, not businesses as direct applicants.

## 2026-05-23 Manitoba Evidence Cleanup

- Tightened Community Enterprise Development Tax Credit and Manitoba Works Capital Incentive with current official amount, applicant, and intake evidence.
- Removed Canada-Manitoba Job Grant and Workforce Development Program because current official pages only state applications are not being accepted and do not expose enough current business/funding evidence for Penny's verified corpus.

## 2026-05-23 New Brunswick Evidence Cleanup

- Tightened Anaerobic Digestor Feasibility Studies Funding Program, New Brunswick Research and Development Tax Credit, and New Brunswick Small Business Investor Tax Credit with current official amount, applicant, and intake evidence.
- Removed Rural Economy Fund because official RDC evidence frames it as rural and community-priority development funding rather than a direct business opportunity.

## 2026-05-23 Newfoundland and Labrador Intake Cleanup

- Tightened Business Growth Program, Employment Enhancement Program, and Job Accelerator and Growth Program with current official intake, applicant, and amount evidence.

## 2026-05-23 Northwest Territories Evidence Cleanup

- Tightened Corporate Mining Incentive Program, SEED Entrepreneur Support, GHG Grant Program for Buildings and Industry, Large Industrial Emitters rebate/grant, NWT Film Rebate Program, Northern Food Development Program, Trades and Occupation Wage Subsidy Program, and Wage Subsidy Program with current official amount, intake, and applicant evidence.

## 2026-05-23 Small Jurisdiction Evidence Cleanup

- Tightened Alberta Workforce Partnerships Grants, Manitoba Green Energy Equipment Tax Credit, Newfoundland and Labrador Innovation and Business Development Fund, and Newfoundland and Labrador Venture Capital Tax Credit with current official applicant, amount, and intake evidence.

## 2026-05-23 Saskatchewan Evidence Cleanup

- Tightened Agriculture Development Fund, Saskatchewan Chemical Fertilizer Incentive, Saskatchewan Technology Fund, and Saskatchewan Value-Added Agriculture Incentive with current official amount, intake, applicant, and claim-process evidence.

## 2026-05-23 New Brunswick Business-Only Cleanup

- Removed Student Employment Experience Development Employer Funding because current official SEED rules say private-sector companies are not eligible.
- Tightened New Brunswick Film Tax Credit with current official regulation and Income Tax Act evidence.

## 2026-05-23 Nunavut Evidence Cleanup

- Tightened Community Tourism and Cultural Industries Program, Nunavut Business Investment Fund, and Small Business Support Program with official amount, intake, applicant, and application evidence.

## 2026-05-23 Yukon Evidence Cleanup

- Tightened Building UP, Economic Development Fund, Spark Tourism Micro-grant, Yukon Media Funds, and Yukon Sustainable Canadian Agricultural Partnership with current official amount, intake, applicant, and eligibility evidence.

## 2026-05-23 Quebec Evidence Cleanup

- Tightened Programme NovaScience, Quebec Investment and Innovation Tax Credit, Quebec Production of Shows Tax Credit, Quebec Tax Credit for Research, Innovation and Commercialization, and Quebec Tax Holiday for a Large Investment Project with current official amount, intake, applicant, and claim-process evidence.
- Removed Subventions aux entreprises adaptees because the retained public page is a closed 2021 call rather than a current business opportunity.

## 2026-05-23 Prince Edward Island Evidence Cleanup

- Tightened Business Energy Rebate, Capital Acquisition Assistance, Community Development Equity Tax Credit, Ignition Fund, Innovation Fund, Marketing Assistance, PEI Broadband Fund for Businesses, PEI Labour Rebate, and Small Business Investment Grant with current official amount, intake, applicant, and claim evidence.
- Removed PEI Electric Vehicle Charging Funding Program because the retained evidence was a stale 2024 closed intake rather than a current opportunity.

## 2026-05-23 Ontario Evidence Cleanup

- Tightened Life Sciences Scale-Up Fund, Ontario Automotive Modernization Program, Ontario Business Research Institute Tax Credit, Ontario Job Creation Partnerships, Ontario Made Manufacturing Investment Tax Credit, and Ontario Together Trade Fund with current official amount, intake, applicant, and claim evidence.
- Kept Ontario Together Trade Fund limited to its non-loan grant path for Penny's no-loans corpus.

## 2026-05-23 British Columbia Evidence Cleanup

- Tightened B.C. Qualifying Environmental Trust Tax Credit, B.C. Traceability Funding Programs, Enhanced Replant Program, Environmental Farm Plan Program, Innovative Clean Energy Fund, and Tree Fruit Climate Change Response Fund with current official amount, intake, applicant, and claim evidence.

## 2026-05-23 New Brunswick Tourism Cleanup

- Tightened Tourism Product Development Grant Program with the official 2026 announcement, while preserving the missing application-guide caveat for Penny's recommendation logic.

## 2026-05-23 Nova Scotia Evidence Cleanup

- Tightened Creative Industries Fund for Creative Businesses, Fisheries and Aquaculture Energy Efficiency Innovation Fund, Graduate to Opportunity, Nova Scotia Digital Media Tax Credit, Nova Scotia Equity Tax Credit for Community Economic Development Investment Funds, Nova Scotia Seafood and Agriculture Strategic Investment Fund, and Planning New Opportunities Program with current official amount, intake, applicant, and claim evidence.

## 2026-05-23 Federal No-Repayable Cleanup

- Removed Business Development Program, Business Scale-up and Productivity in the Prairie provinces, Jobs and Growth Fund in the Prairie provinces, Regional Economic Growth through Innovation in Atlantic Canada, FedNor Business Support Programs, and Canada Fisheries Funds because current official evidence showed repayable direct-business funding, generic mixed repayable bundles, or renewal-watchlist status rather than a current non-repayable business opportunity.

## 2026-05-23 Federal Evidence Cleanup

- Tightened AgriAssurance, AgriMarketing SME, Atlantic Region Qualified Property ITC, CanExport SMEs, Canada Carbon Rebate for Small Businesses, federal film/video credits, Canadian Journalism Labour Tax Credit, CCUS ITC, Clean Hydrogen ITC, Clean Technology Manufacturing ITC, Innovative Solutions Canada Challenge Stream, NRC IRAP, SR&ED ITC, and Supply Management Processing Investment Fund with official amount, intake, applicant, and claim evidence.
- Removed Apprenticeship Service Program Intermediary Funding and Technology Demonstration Program because retained official evidence showed stale or closed call status rather than a current business opportunity for Penny.
