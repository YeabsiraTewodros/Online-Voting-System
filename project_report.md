# Project Report — Ethiopian Online Voting System

**Title**: Design, Implementation, and Evaluation of an Ethiopian Online Voting System

**Date**: January 2026

---

## Abstract

This project implements an online voting system for managing voter registration, election scheduling, party management, voting, and results. The backend is built with Node.js, Express, and PostgreSQL; views are server-rendered using EJS. Key features include role-based admin control (regular admins, super admin, original super admin), secure password storage via bcrypt, file upload support for party and leader images via multer, session management via express-session, and a database schema designed to capture voters, parties, votes, admin settings, and audit logs. The system enforces vote-period constraints and prevents double voting. This report documents the project background, problem statement, objectives, methodology, literature review, data collection and analysis approaches, results and discussion, conclusions, recommendations, references, and appendices. It analyzes the repository architecture and data model, outlines testing and data-collection procedures, presents findings from static code and schema analysis, and provides detailed recommendations to improve security, scalability, and maintainability for production deployment.

---

## 1. Background

### Context and motivation

Electronic and online voting aim to increase accessibility, speed election processing, and provide actionable analytics to election administrators. For a nation like Ethiopia, with geographically dispersed populations and multilingual needs, an online voting platform can support voter registration, management, and results publication while reducing manual overhead.

### Project overview

The repository implements a web-based voting system consisting of:

- Backend: Node.js + Express (`server.js`).
- Database: PostgreSQL (`database.sql` schema, `init_db.js`).
- Templating: EJS for server-rendered views (`views/*.ejs`).
- Static assets: `public/` including CSS, JS, images, uploads.
- Admin role model: `admin`, `super_admin`, `original super_admin`.
- Utilities: `bcryptjs` for password hashing, `multer` for file uploads.

### Stakeholders

- Election administrators: configure election window, manage parties and admins, reset/reseed DB.
- Voters: register, change password, login, vote, view results.
- Developers & auditors: maintain codebase, audit logs, verify security.

### Scope and constraints

The project focuses primarily on a functional prototype: admin workflows, voter registration, voting, and results. It includes seed data and a destructive reset for dev environments. Scalability, cryptographic end-to-end verifiability, and regulatory compliance (e.g., encrypted ballots, voter anonymity safeguards beyond basic controls) are limited in the present code and must be addressed for production.

---

## 2. Problem Statement

Traditional election processes in many contexts are resource-intensive, require large in-person infrastructure, and can be slow for result processing. Challenges include:

- Geographical barriers to voter participation.
- Manual register updates and data-entry errors.
- Slow vote counting and publishing of results.
- Lack of accessible audit trails and automated checks to detect irregularities.
- For the codebase: need to build a maintainable, secure, auditable system that prevents double-voting, supports role-based administration, and scales to realistic voter loads while preserving privacy, integrity, and transparency.

Therefore, the project addresses: how to implement an online voting platform that supports end-to-end administrative workflows, prevents double voting, provides admin audit logs, and allows public results while remaining secure and maintainable.

---

## 3. Objectives

### Primary objective

- Build a maintainable online voting prototype that supports voter registration, secured login, voting with double-vote prevention, and public results.

### Secondary objectives

- Implement role-based admin controls with separated privileges (admin / super_admin / original super_admin).
- Provide audit logs for admin actions and voter activities for accountability.
- Support multimedia assets (party logos and leader images) via secure uploads.
- Provide a simple database reset and reseeding mechanism for development/testing.
- Prepare documentation and per-file explanations to support maintainability and handover.
- Provide guidance for hardening the system for production (security, scaling, backups, monitoring).

---

## 4. Methodology

### Development approach

- Monolithic Node.js application using Express; EJS templates render server-side HTML.
- PostgreSQL used for persistent data; schema defined in `database.sql`.
- Security best-practices applied at prototype level: bcrypt for password hashing, session management for authentication.
- Simple test and reset utilities (`init_db.js`) included to bootstrap development.

### System architecture

- Presentation layer: `views/*.ejs` + static files in `public/`.
- Application layer: `server.js` handles routing, business logic, validation, session checks, and file uploads.
- Persistence layer: PostgreSQL with tables for admins, parties, voters, votes, admin settings, audit logs.
- Uploads: `multer` saves files to `public/uploads/`, DB stores relative URLs.
- Optional components: Redis session store suggested (dependencies included), Knex migration support (`knexfile.js` + scripts).

### Security and privacy approach

- Passwords hashed with bcrypt.
- Session-based authentication and middleware to restrict admin routes.
- Audit logs record admin actions and voter activities to allow traceability.
- Vote records contain minimal metadata (IP, user-agent) for auditing.
- Vote anonymity: currently votes store `voter_id` with votes; for confidentiality this must be redesigned (see recommendations).

### Data collection and instrumentation

- Logs from server (console or configured logger) can be used.
- DB audit records: `admin_audit_log`, `voter_activity_log`.
- To measure performance, run load tests (folder present) with controlled clients and collect latency, throughput, and DB metrics.

### Evaluation method

- Static code review and schema inspection.
- Functional verification of routes and constraints via inspection.
- Proposed dynamic testing plan: unit tests for critical logic, end-to-end tests for flows (register → login → change-password → vote), and load tests to evaluate scaling.

---

## 5. Literature Review (summary)

(Note: This section summarizes relevant literature and standards about e-voting, auditability, and security. The references are indicative and should be expanded with access to specific academic sources.)

### E-voting systems: overview and classification

Online/external voting vs. controlled voting technology. Studies show trade-offs between convenience and risks to confidentiality, integrity, and availability. Early work (Kohno et al., 2004) analyzed vulnerabilities in electronic voting systems, demonstrating how networked systems can be attacked.

### Security requirements for electronic voting

- Confidentiality: ballots must not be linkable to voters. The codebase stores `voter_id` with `votes`, which can break confidentiality. Solutions include cryptographic anonymization (mixnets, blind signatures, homomorphic encryption).
- Integrity: votes must be recorded exactly as cast. Techniques include digital signatures, end-to-end verifiability, and cryptographic receipts.
- Availability: system must survive load and attacks (DDoS). Use of distributed infrastructure, CDNs, and rate-limiting are advised.
- Auditability: maintainable logs, immutable append-only logs (blockchain-like ledgers), and independently verifiable counts.

### Cryptographic approaches

- Homomorphic encryption (e.g., Paillier, ElGamal) allows tallying encrypted ballots without decrypting individual votes.
- Mixnets and blind signatures for anonymity.
- Verifiable mixnets and zero-knowledge proofs enable public verification while preserving privacy.

### Practical deployment considerations

- Usability & accessibility: multilingual UI, low-bandwidth options, and offline fallback for voters without reliable internet.
- Legal and regulatory compliance: voter identity verification, data retention, and transparency rules.
- Operational security: secure key management, hardware trust, and software supply-chain integrity.

### Audit and logging best practices

- Immutable logs, tamper-evident storage, and separation of duties for admin roles.
- Internal traceability: use of structured logs, log aggregation (ELK stack), and monitoring with alerts.

### Scalability and database design literature

- Partitioning and replication for large electoral rolls.
- Use of materialized views for read-heavy summaries like results.
- Indexing and query optimization for aggregated queries (group-by party) — the schema includes relevant indexes.

### Case studies and standards

- Estonian i-Voting, cryptographic systems in major elections, and lessons about trust, transparency, and auditability.
- International standards (ISO/IEC 27001, electoral best practices) provide frameworks for secure deployment.

---

## 6. Data Collection and Analysis

### Data Model Overview

- Tables: `admins`, `parties`, `voters`, `votes`, `admin_settings`, `admin_audit_log`, `voter_activity_log`, `system_config`.
- Key relationships: `votes.voter_id` → `voters.id`.
- Triggers: `update_updated_at_column` maintains `updated_at` timestamps for modified rows.

### Data collection procedures

- Capture logs: server logs, DB audit records.
- Instrumentation: add request timing, DB query logging.
- Load tests: use tools like `k6` or ApacheBench; measure throughput, latency, error rates.

### Example SQL queries for analysis

- Total votes per party:

```
SELECT party, COUNT(*) as votes FROM votes GROUP BY party ORDER BY votes DESC;
```

- Turnout:

```
SELECT (SELECT COUNT(*) FROM votes) as votes_cast, (SELECT COUNT(*) FROM voters WHERE is_active = TRUE) as registered_voters;
```

- Double-vote check:

```
SELECT v.voter_id, COUNT(*) FROM votes v GROUP BY v.voter_id HAVING COUNT(*) > 1;
```

### Data analysis plan

- Clean data: normalize party names, trim whitespace.
- Validate constraints: ensure `finnumber` uniqueness.
- Analysis pipelines: ETL exports, materialized views for aggregation.

### Force & Geometry note

- "Force and geometry analysis" maps to load/stress testing and system topology analysis in software context. The plan above provides load testing and architectural mapping.

---

## 7. Results and Discussion

### Static analysis findings

- Security positives: bcrypt usage, audit tables, session checks.
- Areas of concern: votes linked to voter identity, potential multi-statement execution risk in `init_db.js`, CSRF not consistently enforced.

### Functional observations

- Double-vote prevention implemented at application level.
- Election period enforcement via `admin_settings`.
- Admin role separation present but requires secure session handling.

### Performance and scaling

- Single-node approach is adequate for testing; use Redis for sessions and DB replication for production.

### Privacy and legal considerations

- Re-design votes storage for ballot secrecy; ensure PII storage complies with regulations.

---

## 8. Conclusions and Recommendations

### Summary conclusions

- The repository is a strong prototype for core election workflows; production deployment will require significant hardening for privacy and integrity.

### Short-term recommendations

- Use `party_id` foreign key in `votes` rather than string values.
- Enforce CSRF and centralize error handling.
- Use `connect-redis` for sessions and containerize the app for deployment.

### Long-term recommendations

- Adopt verifiable voting cryptography (mixnets or homomorphic tallying).
- Conduct penetration testing and privacy impact assessments.

---

## 9. References

- Kohno, T., Stubblefield, A., Rubin, A.D., Wallach, D.S. “Analysis of an Electronic Voting System.” USENIX Security, 2004.
- Adida, B. “Helios: Web-based Open-Audit Voting.” USENIX, 2008.
- NIST election security guidance.
- PostgreSQL documentation.
- Express.js documentation.

---

## 10. Appendices

### Appendix A — Repository summary (key files)

- `server.js` — main application.
- `database.sql` — DB schema.
- `init_db.js` — DB initializer.
- `views/*` — EJS templates.
- `public/*` — static assets.
- `package.json`, `knexfile.js` — config and scripts.

### Appendix B — How to run (developer)

```
# Ensure PostgreSQL and credentials in .env
npm run init-db
npm start
```

---

*End of report*
