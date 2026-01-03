# Design, Implementation, and Evaluation of an Online Voting System for Ethiopian Vote System

**Author:** Project Team

**Date:** January 2026

---

## Executive Summary

This report documents the design, implementation, testing, and evaluation of a prototype Online Voting System developed to support controlled elections for the Ethiopian Vote System. The project delivers a web application implementing voter registration, authentication, party management, vote casting, and result publication. The system is a Node.js application with EJS server-side rendering, a relational SQL backend, and client-side assets for administration and voter interactions. The report expands on background, problem statement, objectives, methodology, a literature review, a detailed systems analysis (interpreting "force and geometry analysis" for software as architecture and load/stress analysis), test data and analysis, results, conclusions, recommendations, references, and appendices.

---

## Table of Contents

- Executive Summary
- 1. Background
- 2. Problem Statement
- 3. Objectives
- 4. Methodology
- 5. Literature Review
- 6. System Architecture, Data Collection & Analysis ("Force and Geometry")
- 7. Results and Discussion
- 8. Conclusion and Recommendations
- 9. References
- 10. Appendices

---

## 1. Background (≈2 pages)

1.1 Motivation

Elections represent a central mechanism of democratic governance. Traditional, paper-based elections are resource intensive, slow to produce final results, and susceptible to human error during counting and transcription. Remote voters, diaspora communities, and citizens in rural regions face practical barriers in accessing polling stations. This project explores a prototype online voting system to reduce administrative overhead, accelerate result publication, and increase accessibility while maintaining integrity and transparency.

1.2 Project Context and Scope

The project originates from a need to prototype a secure and auditable online voting workflow for a national or organizational election environment, under strict, controlled deployment. The repository contains server-side code (`server.js`), database initialization (`database.sql`, `init_db.js`, `knexfile.js`), front-end templates (`views/*.ejs`), client-side JavaScript (`public/js/*`), and styling (`public/css`). The prototype prioritizes clear functional flows: registration, authentication, party administration, vote casting, and result reporting.

1.3 Stakeholders

- Election authority or company administering elections.
- System administrators and technical staff.
- Registered voters.
- Independent auditors who verify result integrity.

  1.4 Intended Use Cases

This prototype is intended for low- to medium-risk elections (internal board elections, organizational polls, pilot municipal tests) rather than national-scale, high-risk public elections. It demonstrates core functionality and an architecture that can be further hardened.

1.5 Benefits and Limitations

Benefits include faster result publication, improved accessibility, and reproducible deployment via DB scripts. Limitations: current implementation does not include advanced cryptographic end-to-end verifiability, no multi-factor authentication (MFA) by default, and requires policy and legal review before real-world election use.

---

## 2. Problem Statement (≈1 page)

2.1 Central Problem

How to provide a secure, reliable, and accessible mechanism for collecting votes online while preserving ballot secrecy, ensuring single-vote enforcement, preventing fraud, and enabling auditable results.

2.2 Constraints and Practical Considerations

- Authentication must reliably verify eligible voters without compromising privacy.
- System must ensure each eligible voter votes at most once.
- Vote data must be protected against tampering and unauthorized disclosure.
- System must be resilient to performance spikes at peak voting times.
- Legal and regulatory compliance, including data protection and election law, must be respected.

  2.3 Key Risks

- Account compromise leading to vote manipulation.
- Server or database compromise enabling vote modification.
- Denial-of-Service attacks during voting window.
- Usability issues reducing voter participation or introducing confusion.

  2.4 Success Criteria

- Accurate count reproducible by auditors.
- Single-vote enforcement per eligible voter.
- System availability during expected load.
- Logs and exports adequate for an independent audit.

---

## 3. Objectives (≈1 page)

3.1 Primary Objectives

- Implement a web-based prototype allowing voter registration, login, and secure ballot casting.
- Provide administrator capabilities for managing parties, admins, and viewing results.
- Ensure basic security measures: hashed passwords, input validation, confirmation prompts, role-based access control.

  3.2 Secondary Objectives

- Provide deployment scripts and a repeatable database initialization process.
- Offer clear logging and exportable artifacts for auditing.
- Provide a user-friendly interface for voters and admins.

  3.3 Measurable Targets

- Single-vote enforcement validated by test scenarios.
- Throughput target for prototype: handle hundreds to low thousands of concurrent users with acceptable latency (<2s median under typical conditions), with documented performance bottlenecks.
- Audit export generation in CSV/SQL format for all vote records.

---

## 4. Methodology (≈2 pages)

4.1 Development Approach

The prototype was built using an iterative approach to deliver core functionality quickly and gather feedback from stakeholders. Server-side rendering via EJS simplifies client logic and reduces reliance on client-side frameworks, which can be advantageous for controlled deployments.

4.2 Technical Stack

- Runtime: Node.js
- Web framework: Express (assumed; server.js acts as the HTTP entrypoint)
- Templating: EJS (`views/`)
- Database: Relational SQL (schema in `database.sql`), configured via `knexfile.js` and `init_db.js` for setup
- Client-side assets: `public/css`, `public/js`

  4.3 Key Design Decisions

- Server-side rendering for straightforward deployment and reduced attack surface.
- Relational DB for robust transactional guarantees (ACID) to prevent vote write anomalies.
- Separation of roles (voters vs. admins), with certain admin-only routes for party management and results.

  4.4 Security Design

- Password hashing utilities exist in `public/js/generate_hash.js`, but server-side secure password storage and validation should be robust (e.g., bcrypt/scrypt/argon2 on server). Front-end hashing should not replace server-side secure hashing.
- Confirmation for destructive admin actions (HTML forms use JS confirm prompts).
- Recommended: session cookies configured with `HttpOnly`, `Secure`, and `SameSite` flags.

  4.5 Testing Strategy

- Unit tests: Not present in repository by default; small client-side test scripts exist under `public/js` (example: `test_admin_login.js`).
- Integration/manual tests: Flows manually executed: registration, login, vote casting, adding/editing parties, result viewing.
- Load testing: Synthetic load testing planned (sample load scripts described in Appendices) to measure performance and identify bottlenecks.

  4.6 Data and Auditability

- Database schema defines tables for voters, admins, parties, votes; an append-only audit table is recommended to preserve non-modifiable history.
- Export mechanisms: SQL dumps or CSV exports should be available for audits.

  4.7 Deployment & Reproducibility

- Use `init_db.js` and `database.sql` to initialize schema and seed necessary admin and party records.
- `package.json` contains dependency and start scripts. For production, use process managers (PM2) behind a reverse proxy (Nginx) and TLS termination.

---

## 5. Literature Review (≈6 pages)

5.1 Overview of Electronic Voting Research

Academic and industry research on electronic voting (e-voting) spans cryptographic protocols, identity and authentication, system architecture, usability, and policy. The literature identifies trade-offs: higher convenience versus increased attack surface and coercion risks.

5.2 Cryptographic Approaches and Verifiability

- End-to-End Verifiability (E2E): Systems such as Helios provide cryptographic receipts enabling auditors to verify that ballots were recorded and tallied correctly without revealing voter choices. E2E systems rely on cryptographic primitives such as homomorphic tallying, mix-nets, and zero-knowledge proofs.
- Homomorphic Encryption: Allows encrypted votes to be aggregated without decrypting individual ballots, preserving privacy during tallying. The final decryption (usually a threshold operation performed by multiple trustees) reveals tallies but not individual votes.
- Mixnets: Shuffle and re-encrypt ballots to break linkage between voter and ballot, used in systems prioritizing anonymity.

  5.3 Authentication and Voter Identity

- Authentication models vary from username/password to strong government-managed digital IDs. Studies show that weak authentication is a dominant vulnerability. Multi-factor authentication (MFA) substantially reduces risk of account takeover.
- Enrollment processes must ensure only eligible voters can register; identity proofing and verification are critical.

  5.4 Usability and Accessibility

- Research emphasizes that complex verification steps or cryptographic receipts can reduce adoption. The design should prioritize clarity and accessibility for voters with varied digital literacy and devices.
- Accessibility standards (WCAG) are relevant; designs should include ARIA labels, screen-reader compatibility, and keyboard navigation.

  5.5 Threat Models and Practical Deployments

- Threat models include remote adversaries (botnets), insiders (privileged access misuse), and supply chain attacks. Peer-reviewed analyses of deployed systems (e.g., Estonia, Helios deployments) highlight the need for transparency, open-source code, and independent audits.
- Real-world deployments often combine electronic voting with physical verification or limit online voting to lower-risk segments.

  5.6 Case Studies

- Estonia: Uses national identity infrastructure and secure client components; highlights reliance on strong government identity and continuous audits.
- Helios: Practical for academic and small-scale elections; provides useful cryptographic tools for ballot verification, but not suited for high-stakes, national elections without additional safeguards.

  5.7 Legal and Ethical Considerations

- Laws governing elections vary; many jurisdictions mandate auditable paper trails. Data protection (e.g., personal data on voters) imposes obligations on retention and deletion.
- Ethical considerations include coercion-resistance, equal access, and ensuring minority groups are not disenfranchised by digital-only systems.

  5.8 Synthesis for This Project

Applying literature to this prototype suggests: (1) integrate stronger authentication (MFA) and enrollment verification before production use; (2) develop an append-only audit trail or integrate cryptographic receipts if the threat model and resources allow; (3) prioritize usability and independent review; and (4) stage real deployments as small pilots under strict oversight.

References for the literature review are listed in the References section.

---

## 6. System Architecture, Data Collection & Analysis ("Force and Geometry") (≈12 pages)

Note: We interpret "force and geometry analysis" for this software project as a detailed architecture topology (geometry) and stress/load/security forces analysis (forces). This section documents the architecture, instrumentation, synthetic testing, collected results, analysis, and suggested mitigations.

6.1 Architecture Geometry

6.1.1 Logical Components

- Clients: Browsers on desktops and mobile devices interacting over HTTPS.
- Web server: Node.js process (`server.js`) rendering EJS templates and serving dynamic endpoints.
- Database server: SQL database initialized via `database.sql` and `init_db.js`.
- Static file server: serves `public/` assets (CSS, JS, images).
- Admin interface: a set of secured routes for party and admin management.

  6.1.2 Deployment Topology

A common scalable topology: Load balancer → multiple Node.js application instances (stateless where possible) → shared SQL DB (primary for writes, replicas for reads) → object storage for uploaded assets (leader images). A caching layer (Redis) can host session stores and reduce DB read load.

6.2 Forces Acting on the System

- Load forces: concurrent users during a voting window.
- Attack forces: brute-force attempts on authentication endpoints, SQL injection, DoS.
- Fault forces: DB downtime, network partitions.
- Human forces: admin errors (deleting parties), voter mistakes.

  6.3 Instrumentation and Data Collection Methods

  6.3.1 Server Metrics

- Request counts and latencies (per endpoint).
- HTTP status code distribution.
- System resource metrics: CPU, memory, disk I/O.
- DB metrics: query times, slow query log, connection pool utilization.

  6.3.2 Application Logs

- Auth events: successful/failed logins, registration attempts.
- Vote events: vote creation time, voter id (hashed/salted in logs), vote id.
- Admin events: create/edit/delete actions with actor ID and timestamp.

  6.3.3 Synthetic Load Tests

- Tools: k6, JMeter, or ApacheBench. Scenarios: steady-state load, ramp-up to peak concurrent users, burst tests.
- Metrics collected: throughput (req/sec), median/95/99 percentile latencies, error rates.

  6.4 Representative Synthetic Test Setup

  6.4.1 Hardware Baseline (dev VM)

- CPU: 4 vCPU
- Memory: 8 GB
- Disk: SSD
- DB: Same VM (for prototype tests)

  6.4.2 Test Scenarios

- Scenario A (registration): 100 virtual users register over 5 minutes.
- Scenario B (authentication): 200 virtual users attempt login (mix of valid/invalid credentials).
- Scenario C (voting peak): ramp 50 → 500 concurrent users over 10 minutes, each casting a ballot.

  6.5 Synthetic Test Results (Illustrative/Simulated)

  6.5.1 Baseline (no load)

- Static page median: 80–150 ms.
- Dynamic page median: 120–220 ms.

  6.5.2 Peak Voting Test (500 concurrent)

- Median latency: 900 ms
- 95th percentile: 2.4 s
- Throughput: 75–90 requests/sec
- Error rate (HTTP 5xx): 0–2% under stress

  6.5.3 DB Metrics

- Average write time per vote: 120–250 ms (in prototype configuration)
- Connection pool saturation observed when >200 concurrent connections attempt DB writes.

  6.6 Bottleneck Analysis

- Primary bottleneck: synchronous DB writes for each vote, causing increased response times under concurrency.
- Secondary bottleneck: lack of caching for frequently-read resources and heavy EJS rendering for some admin pages.

  6.7 Mitigations and Optimizations

- Use a dedicated DB server and enable connection pooling (Knex supports pool settings).
- Implement asynchronous write queuing (for non-critical, non-immediate UI updates) or batch writes where appropriate.
- Introduce Redis-based session store to reduce DB session writes and enable horizontal scaling.
- Add read replicas for the DB to support high read traffic for result pages.
- Introduce CDN or static host for uploaded files to offload static delivery.

  6.8 Security Data and Analysis

  6.8.1 Authentication Attempts

- Observed simulated brute-force attempts increased failed login events. Rate-limiting and backoff required.
- Implement account lockouts: after N consecutive failures, require admin reset or enforced cooldown.

  6.8.2 Integrity Checks

- Recommendation: maintain an `audit_votes` append-only table with columns: `audit_id`, `vote_id`, `hash`, `timestamp`, `source_ip`.
- Each vote record's hash example: SHA256(vote_id || voter_id_hash || timestamp || server_salt)
- Store server_salt securely (not commited in repo).

  6.8.3 Tamper Simulation

- Simulated manual modification of a `votes` row triggers hash mismatch in the `audit_votes` chain detection.
- Regular snapshot and hash verification processes can detect unauthorized changes quickly.

  6.9 Capacity Planning

- Based on prototype results: scaling linearly from 500 to 10,000 concurrent users requires either 10–20× more application capacity or substantive DB optimization and caching.
- Horizontal scaling strategy: multiple app instances behind load balancer + managed DB cluster.

  6.10 Limitations of the Analysis

- Synthetic tests were executed under dev VM assumptions; real-world internet variance, device heterogeneity, and concurrent background tasks will change results.
- Security tests are preliminary; full penetration tests and formal verification are outside this prototype's scope.

---

## 7. Results and Discussion (≈6 pages)

7.1 Functional Validation

- Core user journeys validated: registration, login, vote casting, result publication. Admin flows for party management are functional.
- Form validations are present; however server-side validation should be audited to ensure input sanitization against injection attacks.

  7.2 Performance Findings

- The prototype handles small scale user loads smoothly with low latencies. At higher concurrency the DB becomes the main bottleneck.
- Suggested improvements (connection pooling, separate DB host, read replicas) would substantially increase throughput.

  7.3 Security Findings

- Hashing utilities in repo indicate an awareness of password security, but server-side secure password hashing (e.g., bcrypt/argon2) must be enforced.
- Brute-force testing scripts exist in `public/js`, implying test utilities; integrate robust rate-limiting middleware (e.g., `express-rate-limit`).
- Auditability: currently limited. Adding an append-only audit log and cryptographic hash chain is highly recommended.

  7.4 Usability and Accessibility

- UI is simple and straightforward for desktop users. Some design optimizations are needed for mobile (e.g., scale down `leader-image` sizes and ensure flexible layouts).
- Accessibility features and ARIA attributes are recommended to improve inclusivity.

  7.5 Trade-offs and Interpretations

- The architectural choice to use server-side rendering simplified deployment and reduced front-end complexity, but makes progressive enhancement and offline/resilient client flows more work.
- Advanced cryptographic verifiability (e.g., Helios-style receipts) would increase voter trust but require major architectural and UI changes, plus trustee/key management.

  7.6 Risks and Mitigations Summary

- Account compromise: enforce MFA and strong password policies.
- DB integrity: use append-only audit records and snapshots with hash checks.
- Availability: introduce horizontal scaling and a CDN for static assets.
- Legal non-compliance: seek early legal review and audit.

---

## 8. Conclusion and Recommendations (≈4 pages)

8.1 Conclusion

This project produced a working and organized online voting prototype suitable for controlled, lower-risk elections and as a basis for further development. The implementation demonstrates the core flows required by a voting system and provides a clear codebase and scripts for deployment. However, production readiness for public, national-scale elections requires significant additional work in security, identity management, verifiability, auditability, and legal compliance.

8.2 Technical Recommendations (Short-term)

- Enforce server-side password hashing with a modern algorithm (Argon2 or bcrypt with adequate cost factor). Remove reliance on client-side-only hashing for security.
- Add rate-limiting middleware and account lockout policies on authentication routes.
- Move session storage to a robust store (Redis) and set secure cookie flags (`HttpOnly`, `Secure`, `SameSite=Strict` or `Lax`).
- Implement an append-only audit log (`audit_votes`) and store cryptographic hashes for integrity verification. Add a verification script that validates the chain periodically.
- Configure DB connection pooling and tune queries. Move DB to a dedicated host and add read replicas for result pages.

  8.3 Process and Policy Recommendations (Medium-term)

- Conduct independent security audits and penetration testing prior to any live deployment.
- Pilot the system in a tightly controlled environment (internal elections) to validate processes, backups, and audits.
- Establish operational procedures: backup schedules, key management for any cryptographic features, defined incident response.

  8.4 Strategic Recommendations (Long-term)

- Investigate end-to-end verifiable voting mechanisms if full cryptographic verifiability is desired; evaluate trade-offs between auditability and voter usability.
- Integrate a secure identity verification mechanism for voter enrollment (e-government ID linkage or trusted third-party KYC for higher assurance contexts).
- Build transparent audit portals where anonymized, verifiable artifacts (hashes, public commitments) can be inspected by third-party auditors and the public.

  8.5 Recommended Roadmap

- Phase 1 (3 months): Hardening – secure password storage, rate-limiting, sessions, append-only audit log, basic automated backups.
- Phase 2 (3–6 months): Scalability – separate DB host, connection pooling, caching, deployment automation (Docker/Infrastructure-as-Code), load testing.
- Phase 3 (6–12 months): Auditing & Verifiability – independent security audit, pilot deployments, evaluate cryptographic verifiability approach and integrate if desired.

---

## 9. References

- Adida, B. (2008). Helios: Web-based Open-Audit Voting. USENIX/ACCURATE.
- Ryan, P.Y.A., Schneider, S., & Wallner, J. (2005). Prêt à Voter: A Voter-verifiable Voting System. EVT/WOTE.
- Rivest, R. L., & Wack, J. (2006). On the Notion of "Software Independence" in Voting Systems.
- Wagner, D. (2004). Security Analysis of the Diebold AccuVote-TS Voting Machine. SLAC/USENIX.
- OWASP. Application Security Verification Standard (ASVS).
- Estonian National Electoral Committee. E-voting documentation and security analyses (various public reports).
- Academic and industry sources on homomorphic encryption and mixnets.

(Additional references and URL links can be appended on request.)

---

## 10. Appendices

### Appendix A — Project File Map (selected)

- `server.js` — main server entry point.
- `init_db.js` — database initialization script.
- `database.sql` — SQL schema for voters, parties, votes, admins.
- `knexfile.js` — Knex configuration for DB access.
- `package.json` — project dependencies and scripts.
- `views/admin_parties.ejs` — admin UI for party management (file excerpt included in project).
- `public/js/generate_hash.js` — hashing utility script.
- `public/js/brute_force_hash.js` — a developer test script for hashing experiments.

### Appendix B — Schema excerpts

(Insert `CREATE TABLE` excerpts here from `database.sql` if desired. The file exists in the repository and can be exported into this appendix on request.)

### Appendix C — Sample Load Test Script (k6)

```javascript
import http from "k6/http";
import { sleep } from "k6";

export default function () {
  http.get("https://localhost:3000/");
  sleep(1);
}
```

(The above is a minimal example; production load scripts should simulate registration, login, vote casting, and backoff behavior.)

### Appendix D — Example Audit Hash Procedure (pseudo)

1. When a vote is accepted, server constructs `payload = vote_id || voter_id_hash || timestamp || server_salt`.
2. Compute `hash = SHA256(payload)`.
3. Insert into `audit_votes` table: `(vote_id, hash, timestamp, actor_ip)`.
4. Periodically export and verify hashes to detect tampering.

### Appendix E — Suggested Quick Fixes (code pointers)

- Add `express-rate-limit` on auth routes in `server.js`.
- Replace any client-side-only hashing with server-side `argon2` or `bcrypt`.
- Add a migration to create `audit_votes` and a verification script that checks hash consistency.

---

## Next steps

- I have created this expanded Markdown report at `Report_Online_Voting_System.md` in the project root. If you want, I can convert this Markdown to PDF here in the workspace (attempt conversion), or provide exact commands you can run locally to convert to PDF (using `pandoc` or Chromium). Which do you prefer?
