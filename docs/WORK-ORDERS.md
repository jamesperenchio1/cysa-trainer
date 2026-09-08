# Work orders

One brief per remaining objective. Each names the scope, the artifacts to use, the primary
sources to cite, and the trap the questions should be built around — so the agent writing it
does not have to invent any of that, which is where quality drifts.

**Do one objective per session.** Batching degrades everything after the second one.

Order below follows exam weight. Work down it. Done so far: 1.2, 2.3, 3.2.

---

## 1.1 — System and network architecture concepts (SO, 34% domain)

**Scope.** Logging: ingestion, configuration, integrity, time synchronisation, retention.
Operating system concepts: hardening, file structures, critical files, processes. Infrastructure:
cloud-native services, virtualisation, containers, serverless, APIs. Network architecture: zero
trust, ZTNA, SASE, secure access, hybrid. Identity: PAM, MFA, SSO, federation.

**Artifacts.** A syslog config showing retention and forwarding; a Windows event log properties
dialog or `wevtutil` output; a container image layer listing; an NTP status output showing drift.

**Sources.** NIST SP 800-92 (log management), NIST SP 800-207 (zero trust), NIST SP 800-190
(container security), NIST SP 800-63B (authentication).

**The trap to build on.** Time synchronisation. Logs from hosts with drifting clocks make a
timeline unreconstructable, and candidates consistently rank it below more exciting controls.
Also: log integrity — a log an attacker can edit is not evidence.

---

## 1.3 — Tools and techniques to determine malicious activity (SO)

**Scope.** Packet capture and protocol analysis, log analysis and correlation, endpoint and DNS
and email and file analysis tooling, sandboxing, reputation services, scripting for analysis.

**Artifacts.** Wireshark display filter syntax with a follow-stream excerpt; an email header block
with SPF/DKIM/DMARC results; `strings` output over a suspicious binary; a sandbox report summary;
a short PowerShell or bash one-liner to interpret.

**Sources.** Wireshark documentation, MITRE ATT&CK (T1027 obfuscation, T1566 phishing), RFC 7208
(SPF), RFC 6376 (DKIM), RFC 7489 (DMARC).

**The trap.** Reading DMARC results correctly: SPF pass on the envelope sender while the visible
From header is spoofed is the standard business email compromise pattern, and alignment is the
concept people miss.

---

## 1.4 — Threat intelligence and threat hunting (SO)

**Scope.** Threat actors and their TTPs, confidence levels, collection methods, the intelligence
cycle, hypothesis-driven hunting, focusing a hunt, delivering results, indicator management and
sharing.

**Artifacts.** A STIX object excerpt; an ATT&CK Navigator layer description; a threat intel report
snippet with confidence language to assess.

**Sources.** MITRE ATT&CK (framework structure and technique IDs), NIST SP 800-150 (cyber threat
information sharing), OASIS STIX/TAXII documentation.

**The trap.** A hunt without a hypothesis is not a hunt. Also: distinguishing indicators of
compromise from indicators of attack, and knowing that low-confidence intel acted on as fact is
how teams burn their credibility.

---

## 1.5 — Efficiency and process improvement (SO)

**Scope.** Standardised processes, playbooks, orchestration, automation of repeatable tasks, single
pane of glass, technology and tool integration, use of AI in security operations and its limits.

**Artifacts.** A SOAR playbook step list; an API request/response pair for enrichment; a before/after
alert triage time comparison.

**Sources.** NIST SP 800-61r3 (playbooks and preparation), vendor API documentation for the request
shapes.

**The trap.** This objective is where CS0-004 added AI content and it is the least-covered topic in
any reconstructed blueprint — write it carefully. The exam-relevant point is judgement about where
automation and AI belong: automate the deterministic and repeatable, keep the human on the decisions
that carry business consequence, and never automate a containment action that can take production
down without a human in the loop.

---

## 2.1 — Vulnerability scanning methods and concepts (VM, 26% domain)

**Scope.** Asset discovery, mapping and enumeration. Scan types: active, passive, credentialed,
uncredentialed, agent-based, server-based. Special considerations: scheduling, performance impact,
segmentation, operational technology. Industry frameworks and regulatory requirements.

**Artifacts.** A scan policy configuration excerpt; an asset inventory diff showing unmanaged hosts;
a scan schedule against a maintenance window calendar.

**Sources.** NIST SP 800-115 (technical security testing and assessment), NIST SP 800-40r4,
NIST SP 800-82r3 for the OT constraints.

**The trap.** Active scanning against operational technology can knock a device over. The correct
answer in an OT scenario is usually passive discovery, and candidates reach for the more thorough
option without weighing what it does to a PLC.

---

## 2.2 — Analyze output from vulnerability assessment tools (VM)

**Scope.** Network scanners, web application scanners, infrastructure and cloud scanners, debuggers,
multipurpose tools, wireless assessment. Interpreting output and validating findings.

**Artifacts.** A Nessus or OpenVAS finding block with plugin ID, evidence and remediation; `nmap -sV`
and `nmap --script` output; a cloud posture finding for a public storage bucket.

**Sources.** Nmap reference guide, OWASP Web Security Testing Guide, CIS Benchmarks.

**The trap.** Scanner evidence fields. A finding is only actionable if you can read what the scanner
actually observed, and half the false positives in a report are visible as such from the evidence
block alone.

---

## 2.4 — Controls to mitigate attacks and software vulnerabilities (VM)

**Scope.** XSS (reflected, persistent), injection (SQL, command, LDAP), overflow, broken access
control, cryptographic failures, insecure design, misconfiguration, privilege escalation, identity
and access abuse, session hijacking, insecure deserialisation.

**Artifacts.** A vulnerable code snippet with the injection point; an HTTP request/response showing
an IDOR; a session cookie missing HttpOnly and Secure flags.

**Sources.** OWASP Top 10 (2021), OWASP Cheat Sheet Series, CWE entries for the specific weaknesses.

**The trap.** Input validation versus output encoding. They mitigate different things, and the
question is usually which one addresses the specific flaw shown. Also: parameterised queries are the
answer for injection, not input sanitisation.

---

## 2.5 — Vulnerability response, handling and management (VM)

**Scope.** Risk management: acceptance, transfer, avoidance, mitigation. Compensating controls,
patching and configuration management, maintenance windows, exceptions, policies and governance,
service level objectives, attack surface management, secure coding practices.

**Artifacts.** A risk register row with treatment and owner; an exception request form; an SLA table
by severity against actual remediation times.

**Sources.** NIST SP 800-40r4, NIST SP 800-37 (risk management framework), NIST SP 800-53
(control families).

**The trap.** Risk acceptance is a governance action that records a risk rather than reducing one,
and it is premature while an unused control remains available. Also: who is allowed to accept a
risk is a question about authority, not about security.

---

## 3.1 — Attack methodology frameworks (IR, 24% domain)

**Scope.** Cyber kill chain, diamond model of intrusion analysis, MITRE ATT&CK, OSSTMM, OWASP
Testing Guide.

**Artifacts.** A described intrusion to map onto kill chain phases; a diamond model instance with
adversary, capability, infrastructure and victim populated; an ATT&CK technique chain.

**Sources.** MITRE ATT&CK, the Lockheed Martin kill chain paper, the Diamond Model paper
(Caltagirone, Pendergast, Betz).

**The trap.** Frameworks answer different questions and are not interchangeable. Kill chain is
sequential and defender-oriented; the diamond model is analytic and relational; ATT&CK is a
behavioural taxonomy. Questions test whether you know which one fits the task.

---

## 3.3 — Preparation and post-incident phases (IR)

**Scope.** Preparation: playbooks, tooling, training, testing, business continuity, disaster
recovery. Post-incident: forensic analysis, root cause analysis, lessons learned, IR plan updates.

**Artifacts.** A tabletop exercise scenario with injects; a root cause analysis with contributing
factors distinguished; an IR plan revision history.

**Sources.** NIST SP 800-61r3, NIST SP 800-84 (test, training and exercise programmes),
NIST SP 800-34 (contingency planning).

**The trap.** Root cause versus contributing factor. A root cause is an organisational condition
within your control whose correction would have prevented the outcome. Adversary behaviour is never
a root cause. Naming an individual's training gap as the root cause shifts blame off the controls
that actually failed.

---

## 4.1 — Vulnerability management reporting and communication (RC, 16% domain)

**Scope.** Vulnerability metrics and trends, top findings, critical findings, compliance reports,
action plans, inhibitors to remediation, stakeholder identification and communication, risk score
communication, escalation.

**Artifacts.** A metrics dashboard excerpt with a methodology change mid-series; a remediation
action plan; an executive summary paragraph to critique.

**Sources.** NIST SP 800-40r4, NIST SP 800-55 (performance measurement for information security).

**The trap.** Metrics comparability. When the definition of what gets counted changes mid-series,
the numbers measure the definition change rather than performance, and the honest report discloses
the break rather than presenting the improvement.

---

## 4.2 — Incident response reporting and communication (RC)

**Scope.** Stakeholder identification and communication plans, regulatory and legal reporting
requirements and timelines, root cause analysis, lessons learned, incident declaration and
escalation, metrics and KPIs including MTTD and MTTR.

**Artifacts.** A notification timeline with competing regulatory and contractual deadlines; an
executive incident summary; an MTTD/MTTR table with a definition change.

**Sources.** NIST SP 800-61r3, GDPR Article 33 (72-hour supervisory notification, phased submission),
US state breach notification statutes for the law-enforcement delay provisions.

**The trap.** Multiple notification clocks run in parallel and none cancels another. A law
enforcement delay request generally addresses notification to affected individuals under specific
statutes; it does not suspend a regulatory deadline or a private contractual one on its own
authority. Also: incomplete information does not stop the clock — GDPR expressly permits phased
notification.

---

## Standing rules for every work order

- Read `docs/CONTENT-STANDARD.md` before writing. It is the authoring spec.
- Every factual claim cites a free, public primary source with a section or page locator.
- If you cannot cite it, do not write it. Say what source you would need instead.
- Mark 3 or 4 of the 10 questions `held_out: true` so the mock exam pool grows with the bank.
- Run `npm run validate` and fix what it rejects. **Never edit the gate or its thresholds.**
- Do not renumber, add or remove objectives in `content/blueprint.json`. If the blueprint looks
  wrong, say so and stop — replacing it is a separate job that needs the official PDF.
