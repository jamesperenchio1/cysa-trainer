# -*- coding: utf-8 -*-
# Generates data/questions.json — a hard-calibration CySA+ (CS0-004) question bank.
# Design principle: every wrong answer must be a TRUE statement about something
# real, just not the best/correct fit for THIS scenario. No throwaway distractors.
import json, os

Q = []

def add(domain, subtopic, stem, choices, explanation, difficulty=4, exhibit=None, select_n=1):
    """choices: list of (text, is_correct) tuples"""
    key = f"{domain}-{len([q for q in Q if q['domain']==domain])+1:03d}"
    labels = "ABCDEF"
    ch = [{"label": labels[i], "body": t, "correct": c} for i, (t, c) in enumerate(choices)]
    Q.append(dict(external_key=key, domain=domain, subtopic=subtopic, difficulty=difficulty,
                   is_multi=select_n > 1, select_n=select_n, stem=stem, exhibit=exhibit,
                   choices=ch, explanation=explanation))

SO, VM, IR, RC = "SO", "VM", "IR", "RC"

# ======================= SECURITY OPERATIONS =======================

add(SO, "Zero Trust / Architecture",
    "A zero trust rollout still allows a legacy ERP server to accept unauthenticated SNMP polling from the monitoring subnet, justified as 'read-only and internal.' Which statement BEST evaluates this exception?",
    [("It is fully compliant with zero trust since the traffic never leaves the internal network", False),
     ("It violates zero trust's core principle of explicit verification for every request regardless of network location, even though the risk may be low enough to formally accept", True),
     ("It is acceptable because SNMP read-only community strings are considered a strong authentication mechanism", False),
     ("It is irrelevant to zero trust since zero trust only applies to user identities, not device-to-device traffic", False)],
    "Zero trust requires explicit verification for every request, including internal, device-to-device, and 'read-only' traffic — network location or perceived low risk doesn't exempt a request from the model. This may still be a reasonable *documented risk acceptance*, but that's different from claiming it's compliant.",
    exhibit=None)

add(SO, "Zero Trust / Architecture",
    "Which of the following is the SINGLE biggest architectural gap that would prevent an organization from claiming a genuine zero trust implementation, even if it has strong MFA everywhere?",
    [("Lack of per-session, context-aware authorization decisions (device posture, location, behavior) beyond initial authentication", True),
     ("Using a single MFA provider for both cloud and on-premises resources", False),
     ("Allowing employees to use personal mobile devices for email after MFA", False),
     ("Using role-based access control instead of attribute-based access control everywhere", False)],
    "Strong authentication alone is necessary but not sufficient — zero trust requires continuous, contextual authorization for every request (device posture, behavior, risk signals), not just a one-time login check. RBAC vs ABAC is an implementation detail, not a disqualifying gap.",
    difficulty=5)

add(SO, "Network Architecture",
    "A cloud workload's security group allows inbound traffic on port 443 from 0.0.0.0/0, but the application also silently listens on port 8443 with no security group rule referencing it. Which statement is MOST accurate?",
    [("Port 8443 is safe by default because no rule explicitly allows it", False),
     ("The security group is a default-deny allowlist model, so 8443 should be unreachable unless the underlying OS firewall or a misconfigured rule elsewhere also permits it — this must be verified, not assumed", True),
     ("Since 443 is already open to the world, 8443 poses no additional risk", False),
     ("Cloud security groups only filter outbound traffic, so this configuration is irrelevant to inbound exposure", False)],
    "Security groups are typically default-deny/allowlist, so an unlisted port *should* be blocked — but 'should' isn't verification. Analysts must confirm there's no broader rule (e.g., an overly permissive range), OS-level firewall exception, or load balancer path exposing it before assuming it's safe.",
    difficulty=4)

add(SO, "Network Architecture",
    "An organization implements microsegmentation in its cloud environment using workload identity-based policy instead of IP-based rules. What is the PRIMARY operational problem this specifically solves that IP-based segmentation cannot?",
    [("It removes the need for any network monitoring", False),
     ("It maintains consistent policy enforcement as workloads are dynamically created, destroyed, and rescheduled with changing IP addresses (e.g., in Kubernetes/autoscaling)", True),
     ("It automatically encrypts all data at rest", False),
     ("It eliminates the need for a CI/CD pipeline security review", False)],
    "IP-based rules break down in dynamic environments where addresses are ephemeral (containers, autoscaling groups). Identity-based microsegmentation ties policy to the workload's identity/certificate rather than a transient IP, so policy survives rescheduling.",
    difficulty=4)

add(SO, "Network Architecture",
    "A SASE deployment routes all branch office traffic through a cloud-delivered security stack before reaching the internet or internal apps. A branch office reports that a latency-sensitive VoIP application now has noticeably worse call quality. What is the MOST likely architectural cause?",
    [("SASE cannot support any real-time traffic under any configuration", False),
     ("Traffic is being backhauled through a distant cloud PoP instead of being handled by a nearby edge node, or VoIP traffic isn't configured for local breakout/QoS prioritization", True),
     ("VoIP traffic is immune to network path changes, so the SASE deployment is unrelated", False),
     ("SD-WAN and SASE are mutually exclusive, so this is expected and cannot be fixed", False)],
    "SASE's benefit depends on proximity to a nearby PoP and proper traffic steering (local breakout, QoS) for latency-sensitive apps; if VoIP is being routed to a distant PoP or not prioritized, call quality suffers. This is a configuration/architecture issue, not an inherent SASE limitation.",
    difficulty=4)

add(SO, "Indicators of Malicious Activity",
    "A signed, Microsoft-approved binary (`certutil.exe`) is invoked with `-urlcache -split -f` against an internal file share, immediately followed by execution of the retrieved file, under a chain of `explorer.exe -> cmd.exe -> certutil.exe`. IT confirms certutil is on the organization's approved software list for certificate operations. What is the strongest reason to still escalate this as malicious?",
    [("certutil.exe being a signed Microsoft binary makes any use of it inherently suspicious", False),
     ("The flags are being used to download-and-execute a file — a well-documented LOLBin abuse pattern that has nothing to do with certutil's approved certificate-management purpose", True),
     ("Retrieval from an internal file share instead of the public internet lowers the risk to negligible", False),
     ("explorer.exe spawning cmd.exe is inherently abnormal and is itself the strongest indicator", False)],
    "The key insight is that an approved binary can still be abused for a completely different, unapproved function. -urlcache/-split is a known technique to smuggle a file download-and-execute past application allowlisting that only checks for 'is this binary approved.' Internal-source doesn't equal safe (an internal share can itself be compromised or staged), and explorer->cmd is common in normal use.",
    difficulty=5)

add(SO, "Indicators of Malicious Activity",
    "Two hosts show outbound HTTPS beacons to the same external IP. Host A connects every 60 seconds ± 1 second with 1.2KB payloads. Host B connects at pseudo-random intervals averaging 58 seconds, ranging from 20-140 seconds, with payload sizes varying 0.5-4KB. Which is the more sophisticated/evasive beacon pattern, and why?",
    [("Host A, because its precise timing is easier for an analyst to notice", False),
     ("Host B, because jittered timing and variable payload size are deliberately designed to defeat simple threshold/interval-based detection rules that Host A's pattern would trigger", True),
     ("Neither is more sophisticated since both are equally detectable by any SIEM", False),
     ("Host A, because 60-second intervals are a known-safe interval used by legitimate software", False)],
    "Fixed-interval, fixed-size beacons (Host A) are actually the EASIER pattern to catch with simple rules. Real, more advanced malware adds jitter and payload-size variance specifically to blend into normal traffic noise and evade naive detection thresholds — recognizing this distinction is a common CS0-004 trap.",
    difficulty=5)

add(SO, "Indicators of Malicious Activity",
    "An analyst sees a burst of NXDOMAIN responses for high-entropy subdomains under one parent domain, but the query volume is only 40 queries over 24 hours (not thousands). Should this be dismissed as 'too low volume to be DNS tunneling'?",
    [("Yes — DNS tunneling always requires very high query volumes to be effective, so low volume rules it out", False),
     ("No — low-and-slow exfiltration/C2 channels deliberately use low query volume to stay under volumetric detection thresholds; volume alone should not be the deciding factor, entropy and destination pattern still matter", True),
     ("Yes — NXDOMAIN responses always indicate a harmless typo or misconfigured client", False),
     ("No — but only external, government-run domains can be used for tunneling, so the destination is what disqualifies this", False)],
    "Attackers deliberately throttle tunneling/C2 channels to stay beneath naive volume-based thresholds. Relying on volume alone as a disqualifier is a common analyst mistake — entropy, NXDOMAIN ratio, and destination reputation remain meaningful regardless of raw count.",
    difficulty=5)

add(SO, "Indicators of Malicious Activity",
    "A host shows a process injection technique where malicious code is written into the memory space of a legitimate, already-running `svchost.exe` process rather than being dropped as a new executable to disk. What is the PRIMARY detection challenge this technique creates?",
    [("It has no detection challenge since antivirus always scans running memory in real time by default", False),
     ("Traditional file-based/signature antivirus scanning that inspects files written to disk will not see this activity, since no new malicious file is ever written — memory-focused EDR telemetry is needed instead", True),
     ("svchost.exe cannot be a target for injection since it is a protected system process", False),
     ("This technique only works on Linux systems, not Windows", False)],
    "Fileless/process-injection techniques specifically evade disk-based AV scanning because there's no new file artifact to catch. This is precisely why EDR (memory/behavioral telemetry) has become essential alongside traditional signature-based AV.",
    difficulty=4)

add(SO, "Indicators of Malicious Activity",
    "A privileged account shows a login from an approved corporate laptop, at a normal time of day, using the correct MFA method — but the login originates from a residential IP address in a country the employee has never traveled to or worked remotely from. Which detail makes this the strongest indicator of compromise despite everything else looking normal?",
    [("The correct MFA method being used automatically rules out compromise", False),
     ("Geographic/network-origin anomaly relative to the user's established baseline is a strong indicator on its own, since attackers increasingly use stolen session tokens or SIM-swap/MFA-fatigue techniques that satisfy MFA checks without the legitimate user's involvement", True),
     ("Normal login time of day means this cannot be malicious", False),
     ("An approved corporate laptop fingerprint can never be spoofed or reused by an attacker", False)],
    "This question tests whether analysts over-trust MFA as a binary 'safe' signal. Techniques like session token theft, MFA fatigue/push-bombing, or SIM swapping can satisfy authentication checks while still representing a genuine compromise — geographic/behavioral baseline deviation remains meaningful even when every individual control 'passed.'",
    difficulty=5)

add(SO, "Indicators of Malicious Activity",
    "Which of the following, if observed in isolation with no other context, is the WEAKEST standalone indicator of malicious activity?",
    [("A new scheduled task created by a non-admin user account outside change windows", False),
     ("A single failed login attempt for a user who then successfully authenticates 3 seconds later with the correct password", True),
     ("LSASS being opened with PROCESS_VM_READ access by an unsigned, unrecognized binary", False),
     ("A workstation issuing 1,800 DNS queries to a single domain with random subdomains in 20 minutes, mostly NXDOMAIN", False)],
    "A single mistyped password followed by an immediate correct login is common, everyday user behavior and carries very low signal on its own. The other three are all high-confidence indicators (persistence, credential dumping, and tunneling, respectively) even without additional context.",
    difficulty=3)

add(SO, "Indicators of Malicious Activity",
    "An EDR shows `rundll32.exe` executing with no visible DLL argument in the default alert view. A junior analyst closes the alert as benign because 'rundll32 is a normal Windows process.' What is the correct next step BEFORE any disposition decision, and why?",
    [("Trust the junior analyst's disposition since rundll32.exe is indeed a legitimate signed binary", False),
     ("Pull the full command line and actual DLL path/hash from raw EDR telemetry, since alert summary views often truncate or hide arguments — rundll32 with a hidden/obfuscated DLL argument is a well-known LOLBin persistence and execution technique", True),
     ("Immediately wipe and reimage the host without further investigation", False),
     ("Disable the EDR agent on that host since it is generating a false positive", False)],
    "The trap here is trusting a summary view and the binary's legitimacy without checking what it was actually told to load. rundll32 is frequently abused specifically because analysts pattern-match on 'signed Windows binary = safe' rather than inspecting the full invocation.",
    difficulty=4)

add(SO, "Indicators of Malicious Activity",
    "A server shows a spike in outbound traffic to multiple destination IPs on port 6667, alongside CPU usage patterns inconsistent with any known scheduled job. Port 6667 is historically associated with which category of activity in a threat-hunting context (while noting it is not proof by itself)?",
    [("Standard HTTPS web browsing traffic", False),
     ("Legacy IRC (Internet Relay Chat) traffic, historically associated with botnet C2 channels, though the port alone is only a weak/legacy indicator worth correlating with other signals", True),
     ("DNS zone transfers", False),
     ("SMTP mail relay traffic", False)],
    "Port 6667 is the classic IRC port and has long historical association with botnet C2 (many legacy botnets used IRC channels for command and control). However, port number alone is a weak, easily-spoofed indicator — treat it as one data point to correlate, not standalone proof, which is the nuance this question tests.",
    difficulty=3)

add(SO, "Security Tools",
    "A security team wants a single capability to correlate an endpoint alert, a suspicious email delivery event, and an anomalous cloud-login event into one unified incident timeline, using data ALREADY collected by separate point tools. Which capability category is the BEST fit, distinct from simply adding another EDR agent?",
    [("XDR (extended detection and response), which ingests and correlates telemetry across multiple existing security layers", True),
     ("A second, redundant EDR deployment on the same endpoints", False),
     ("A traditional signature-based antivirus upgrade", False),
     ("A vulnerability scanner with a larger plugin library", False)],
    "This is precisely XDR's differentiator versus EDR: correlating telemetry that already exists across multiple layers (endpoint, email, identity/cloud) into unified detections, rather than deepening visibility on just one layer.",
    difficulty=3)

add(SO, "Security Tools",
    "A SOAR playbook automatically disables a user account and revokes all active sessions the moment impossible-travel is detected, without analyst review. Two weeks later, this fires on a VP who was legitimately using a VPN exit node while traveling, causing a business disruption. What is the BEST structural fix, rather than simply disabling the playbook?",
    [("Remove SOAR automation entirely and return to fully manual response for all future alerts", False),
     ("Add a risk-tiered approval step to the playbook (e.g., auto-remediate for standard users, require analyst confirmation for VIP/executive accounts or when a known corporate VPN egress is involved) rather than blanket full automation", True),
     ("Permanently exempt all VP-level accounts from any impossible-travel detection going forward", False),
     ("Increase the SOAR platform's licensing tier, which will automatically fix false positive rates", False)],
    "The lesson isn't 'automation is bad' or 'exempt VIPs entirely' (both create worse outcomes) — it's that automated response playbooks should be risk-tiered, adding human-in-the-loop checkpoints for higher-stakes/ambiguous cases while keeping full automation for clear-cut, lower-risk scenarios.",
    difficulty=4)

add(SO, "Security Tools",
    "Which statement correctly distinguishes a next-generation firewall (NGFW) with IPS functionality from a standalone, dedicated IPS appliance in most modern deployments?",
    [("An NGFW can never include IPS functionality; they are always separate devices", False),
     ("An NGFW integrates IPS (along with application awareness and other Layer 7 inspection) into a single platform, whereas a standalone IPS focuses purely on threat detection/blocking without broader firewall policy management", True),
     ("A standalone IPS always has higher throughput than any NGFW regardless of hardware", False),
     ("NGFWs only operate at Layer 2 and cannot inspect application-layer traffic", False)],
    "Modern NGFWs commonly integrate IPS as one feature within a broader Layer 7-aware platform (app control, URL filtering, IPS, etc.), while a dedicated IPS appliance is more narrowly focused — this is an architectural/integration distinction, not a capability the NGFW lacks.",
    difficulty=3)

add(SO, "Security Tools",
    "A CASB (Cloud Access Security Broker) deployed in API mode (as opposed to inline/proxy mode) has which key limitation an analyst should account for?",
    [("It cannot see any data at all, ever, about sanctioned cloud app usage", False),
     ("It typically provides near-real-time (not truly real-time, inline) visibility and control, since it works by querying the cloud provider's API rather than sitting in the live traffic path — meaning a brief window of exposure can occur before a policy action is applied", True),
     ("It only works with on-premises applications, never SaaS", False),
     ("It replaces the need for any identity provider or SSO integration", False)],
    "API-mode CASB integrates after-the-fact via provider APIs (great for visibility and broad SaaS coverage without routing traffic through a proxy) but isn't inline, so there is inherently a short detection-to-action lag compared to proxy/inline mode, which blocks in real time but requires traffic redirection.",
    difficulty=4)

add(SO, "Security Tools",
    "An organization deploys deception technology consisting of fake credentials planted in a password manager vault, alongside a decoy admin share with no legitimate business purpose. A SOC alert fires from the decoy share. Which statement about this alert's reliability is MOST accurate?",
    [("It has a meaningfully higher false-positive rate than typical SIEM correlation alerts, since legitimate users regularly access decoy resources by accident", False),
     ("It carries very high confidence, since no legitimate process or user has any valid reason to interact with a resource that serves no real business function", True),
     ("It should be ignored, since decoy/honeytoken alerts are considered unreliable by design", False),
     ("It is only useful for external attackers and will never detect insider threats", False)],
    "The core value proposition of deception technology is precisely this: since decoys have zero legitimate use, any interaction is inherently high-confidence, regardless of whether the actor is external or an insider.",
    difficulty=3)

add(SO, "Threat Intelligence",
    "A threat intel report states: 'Source: usually reliable (B). Information: confirmed by other independent sources (2).' Compared to a second report rated 'F/6' (reliability cannot be judged / cannot be judged), which report should carry more weight in a risk decision, and why?",
    [("The F/6 report, because unproven sources are inherently more exciting and often correct", False),
     ("The B/2 report, because it reflects both a track record of source reliability and independent corroboration of the specific claim — this is a materially stronger basis for action than an unjudgeable source with unverifiable content", True),
     ("Both should be weighted identically since all threat intel is equally speculative", False),
     ("The F/6 report, because a lower letter/number always indicates higher confidence numerically", False)],
    "Under the Admiralty Code, B/2 (reliable source, independently corroborated) is a strong basis for action; F/6 (unjudged reliability, unjudged credibility) provides essentially no confidence basis at all. This tests whether the letter/number scale is understood as a confidence rating, not an arbitrary numeric ranking.",
    difficulty=4)

add(SO, "Threat Intelligence",
    "Threat intel attributes a campaign to a known nation-state group with 'high confidence' based on TTP overlap and reused C2 infrastructure. A week later, a rival group is found to have reused the same leaked toolset. What does this scenario BEST illustrate about attribution?",
    [("Attribution based on TTPs and infrastructure is always 100% reliable once published and should never be revisited", False),
     ("Shared/leaked tooling and reused infrastructure can be repurposed by other actors, meaning attribution confidence should be treated as provisional and updated as new evidence emerges, not treated as a permanent fact", True),
     ("This proves threat intelligence has no value and should be disregarded entirely", False),
     ("Nation-state groups never share tooling with other groups under any circumstances", False)],
    "This illustrates a core caution around attribution: TTPs and infrastructure can be copied, leaked, sold, or intentionally reused as a false flag, so attribution should be communicated with appropriate confidence levels and revisited as new evidence surfaces — not treated as immutable fact.",
    difficulty=4)

add(SO, "Threat Intelligence",
    "An organization only consumes a single free, community-run threat intel feed and treats every IOC in it as automatically block-worthy across all firewalls with no review. What is the MOST significant risk of this approach?",
    [("Community feeds are always completely accurate and this approach carries no risk", False),
     ("Automatically actioning unvetted IOCs from a single, unvalidated source risks operational disruption from false positives (blocking legitimate infrastructure) and gives no defense-in-depth if that single feed misses something", True),
     ("This approach guarantees full coverage against all current threats", False),
     ("Free feeds are technically incapable of containing IP addresses or domains", False)],
    "Relying on a single, unvalidated feed with automatic action creates two risks at once: false positives causing business disruption, and a single point of failure for detection coverage. Mature threat intel programs validate/correlate across multiple sources before automated action.",
    difficulty=3)

add(SO, "Threat Hunting",
    "A threat hunter's hypothesis ('adversaries may be using scheduled tasks for persistence') returns zero suspicious scheduled tasks across the environment after a thorough hunt. What is the MOST appropriate interpretation of this result?",
    [("The environment is definitely fully compromise-free with certainty", False),
     ("This specific hypothesis was not confirmed for this technique in the data reviewed; it reduces (but does not eliminate) likelihood for this specific persistence method and should prompt hunting against other techniques, not a conclusion of total safety", True),
     ("The hunt was a failure and provided no value since nothing was found", False),
     ("The hunting program should be discontinued since this hypothesis returned no results", False)],
    "A negative hunt result is still valuable — it reduces uncertainty about one specific technique — but it is not proof of a clean environment, since adversaries have many other possible techniques (registry run keys, WMI subscriptions, service creation, etc.). This tests against over-generalizing a single hunt's scope.",
    difficulty=4)

add(SO, "Threat Hunting",
    "During a hunt, an analyst finds a service account performing interactive RDP logins to five servers overnight — but change management records show a legitimate, approved patch deployment was scheduled for that exact window using that same account. What should the analyst do NEXT, rather than immediately closing the finding as benign?",
    [("Immediately close the finding since a matching change record fully explains the activity with certainty", False),
     ("Verify that the actual observed behavior (specific servers touched, commands run, data accessed) matches what the approved change actually authorized — attackers have been known to time malicious activity to piggyback on legitimate maintenance windows", True),
     ("Escalate to a full incident regardless of the change record, since any anomaly must be treated as confirmed malicious", False),
     ("Disable the service account permanently without any further verification", False)],
    "A plausible-looking legitimate explanation should still be verified against the actual observed scope of activity — a documented change window doesn't guarantee everything that happened during it was authorized. This tests against prematurely closing a finding on pattern-match alone.",
    difficulty=5)

add(SO, "Threat Hunting",
    "A hunting team is deciding between two data sources to detect PowerShell-based living-off-the-land activity: (1) Windows Security Event ID 4688 (process creation) with basic command-line auditing, or (2) PowerShell Script Block Logging (Event ID 4104). Which provides the deeper visibility specifically needed to catch obfuscated/encoded malicious scripts, and why?",
    [("Event ID 4688 alone, because process creation events always include full deobfuscated script content", False),
     ("Event ID 4104 (Script Block Logging), because it captures the actual PowerShell code being executed — including code that is dynamically generated or deobfuscated at runtime — which command-line logging alone will not reveal", True),
     ("Neither source provides any more insight than the other; they are functionally identical", False),
     ("Event ID 4688 is deprecated and no longer exists in modern Windows versions", False)],
    "4688 shows the command line as invoked (which attackers often obfuscate/encode to evade string-matching), while Script Block Logging (4104) captures the actual code block being executed, including content deobfuscated at runtime — giving far deeper visibility into what a PowerShell-based LOLBin attack is really doing.",
    difficulty=5)

add(SO, "Threat Hunting",
    "Which best describes the relationship between the Hunting Maturity Model's 'Innovative' level and its 'Procedural' level?",
    [("Innovative organizations rely purely on manual, ad hoc hunts with no documented process, while Procedural organizations use no automation at all", False),
     ("Procedural organizations follow repeatable, documented hunt processes created by others; Innovative organizations develop new hunting techniques/analytics themselves and often begin automating parts of the hunt process", True),
     ("The two levels are identical in practice and differ only in naming", False),
     ("Innovative is a lower maturity level than Procedural", False)],
    "The Hunting Maturity Model progresses roughly: Initial (no real hunting) -> Minimal -> Procedural (following others' documented techniques) -> Innovative (creating new techniques/analytics, increasing automation) -> Leading (highly automated). Innovative sits above Procedural, distinguished by original technique development.",
    difficulty=4)

# ======================= VULNERABILITY MANAGEMENT =======================

add(VM, "Scanning Methodology",
    "A credentialed scan against a Linux server returns FEWER findings than an uncredentialed scan of the same host ran the same day. What is the MOST likely explanation, assuming both scans completed successfully?",
    [("The credentialed scan is broken and its results should be discarded", False),
     ("The uncredentialed scan likely flagged version-banner-based 'possible' vulnerabilities that the credentialed scan was able to rule out by directly confirming actual installed package versions and applied patches", True),
     ("Credentialed scans are always less accurate than uncredentialed scans by design", False),
     ("The host must have been patched in between the two scans", False)],
    "Uncredentialed scans often infer vulnerability from service banners/version strings alone, generating more false positives. A credentialed scan can directly query installed package versions and confirm whether a patch is actually applied, often *reducing* the finding count by eliminating false positives — not because it's less thorough.",
    difficulty=4)

add(VM, "Scanning Methodology",
    "An organization scans its cloud environment monthly via a network-based scanner, but ephemeral containers with a median lifetime of 6 hours make up a large share of the workload fleet. What is the MOST significant limitation of this scanning approach for that fleet?",
    [("Network scanning provides perfectly adequate coverage of the ephemeral fleet regardless of container lifetime", False),
     ("A monthly scan interval will almost never actually catch most ephemeral containers while they exist, creating a substantial blind spot that requires a different approach (e.g., scanning the base image/pipeline rather than the running instance)", True),
     ("Ephemeral containers are inherently immune to vulnerabilities", False),
     ("This limitation only affects credentialed scans, not uncredentialed ones", False)],
    "A monthly cadence against assets that live for hours is a fundamental mismatch — most instances will be created and destroyed between scans. The correct approach shifts left: scan the base image and CI/CD pipeline rather than relying on catching short-lived runtime instances.",
    difficulty=4)

add(VM, "Scanning Methodology",
    "A vulnerability scanner is granted a service account with full local administrator rights on every scanned Windows host, for the stated purpose of 'ensuring maximum finding accuracy.' What is the MOST important security consideration this introduces?",
    [("There is no security consideration since scanning traffic is inherently trusted", False),
     ("The scanning credential itself becomes a high-value target — if compromised, it would grant an attacker administrative access across the entire scanned fleet, so the credential needs equivalent protections (vaulting, least-privilege scoping, monitoring) as any other privileged account", True),
     ("Local administrator rights provide no additional scan accuracy over a standard user account", False),
     ("This configuration is required by every vulnerability scanning vendor with no alternative", False)],
    "Credentialed scanning genuinely needs elevated access for accuracy, but that access must be treated as a crown-jewel credential (vaulted, rotated, scoped as tightly as feasible, monitored) since compromising the scanner's service account could hand an attacker admin rights across the whole fleet — a real risk-management tradeoff, not a free accuracy win.",
    difficulty=4)

add(VM, "Scanning Methodology",
    "A scan of an OT/ICS environment using standard active scanning techniques causes a PLC to crash and disrupts a production line. What should have been done differently, and why?",
    [("Active scanning should never be used anywhere under any circumstances going forward", False),
     ("A passive scanning approach (or an active scan specifically validated as safe for fragile OT devices, run during a planned maintenance window) should have been used, since many OT/ICS devices have limited processing headroom and can be destabilized by unexpected probe traffic", True),
     ("The scan should have used even more aggressive settings to complete faster and reduce exposure time", False),
     ("OT/ICS devices are immune to being affected by network scans by design", False)],
    "OT/ICS environments often run fragile, resource-constrained devices never designed to handle unexpected/aggressive network probing. Passive scanning (observing traffic) or carefully validated, scheduled active scans are the standard approach — not abandoning scanning OT entirely, and not scanning more aggressively.",
    difficulty=4)

add(VM, "Scanning Methodology",
    "A scan schedule excludes a subnet because 'it's just printers and shouldn't have real vulnerabilities.' Six months later, one of those printers is found to have been used as a foothold for lateral movement. What does this scenario BEST illustrate?",
    [("Printers are inherently unhackable, so this must have been a misconfiguration unrelated to scanning", False),
     ("Assumptions about an asset class's risk profile (based on function rather than actual firmware/exposed services) should not drive scan-scope exclusions — scope should be based on comprehensive asset inventory, not informal risk assumptions", True),
     ("This proves vulnerability scanning has no value and should be abandoned", False),
     ("Only servers and workstations can ever be used for lateral movement, so this scenario is implausible", False)],
    "Network-connected devices of any type — printers, IoT, IP cameras — run firmware/software with real vulnerabilities and are frequently used as low-visibility footholds. Excluding a device class from scanning based on informal assumptions rather than actual risk assessment is a common, costly VM program gap.",
    difficulty=3)

add(VM, "CVSS / Prioritization",
    "Vulnerability A: CVSS 9.8 (AV:N/AC:L/PR:N/UI:N), no known exploit, on an isolated air-gapped historian server. Vulnerability B: CVSS 8.1 (AV:N/AC:L/PR:L/UI:N), EPSS score of 0.94 (94th+ percentile likelihood of exploitation in the next 30 days), on an internet-facing customer portal. Which should be prioritized first, and what is the key reasoning?",
    [("Vulnerability A, because its CVSS Base score is numerically higher and CVSS should always override other signals", False),
     ("Vulnerability B, because the combination of a very high EPSS (real-world exploitation likelihood) and internet-facing exposure represents materially higher actual risk despite the lower raw CVSS score, while Vulnerability A's air-gapped isolation substantially reduces its practical exploitability", True),
     ("Both are equally urgent and should be remediated simultaneously with equal resourcing", False),
     ("Vulnerability A, because air-gapped systems always have higher inherent risk than internet-facing ones", False)],
    "This is exactly the kind of prioritization CS0-004 emphasizes: raw CVSS ignores real-world exploitation likelihood (EPSS) and actual reachability (exposure/isolation). A slightly lower CVSS score with a very high EPSS on an internet-facing asset is typically the more urgent real-world risk than a higher CVSS score on a genuinely isolated system.",
    difficulty=5)

add(VM, "CVSS / Prioritization",
    "A vulnerability's CVSS vector includes `AC:H` (Attack Complexity: High). What does this specifically mean for prioritization, as distinct from `PR:H` (Privileges Required: High)?",
    [("AC:H means the attacker must already have valid credentials before exploiting the vulnerability", False),
     ("AC:H means successful exploitation depends on conditions largely outside the attacker's control (e.g., winning a race condition, specific victim configuration) making reliable exploitation harder — this is a different constraint than PR:H, which is about required privilege level, not exploitation reliability", True),
     ("AC:H and PR:H are two labels for exactly the same underlying concept", False),
     ("AC:H always results in a higher CVSS score than AC:L, all else being equal", False)],
    "AC (Attack Complexity) reflects conditions beyond the attacker's control that affect exploitation reliability (timing, specific configurations); PR (Privileges Required) reflects what access level the attacker needs before attempting exploitation. Confusing these two distinct metrics is a common exam trap. Also note: AC:H actually LOWERS the score relative to AC:L, since higher complexity means less risk, not more.",
    difficulty=5)

add(VM, "CVSS / Prioritization",
    "A finding is scored using CVSS Environmental metrics that account for the organization's actual compensating controls, resulting in an Environmental score of 5.4 versus a Base score of 8.8. A compliance auditor insists only the Base score of 8.8 can be reported since 'that's the official CVE score.' Which statement correctly resolves this disagreement?",
    [("The auditor is correct; only the vendor-published Base score may ever be used for any internal risk communication", False),
     ("Both scores serve different purposes: the Base score is the vendor's context-free severity rating (appropriate for public CVE tracking/comparison across organizations), while the Environmental score reflects this organization's actual risk given its specific compensating controls — internal prioritization should use the Environmental score, while compliance/external reporting may still require citing the Base score", True),
     ("The Environmental score is never a legitimate CVSS component and should be disregarded entirely", False),
     ("Compensating controls have no effect on CVSS scoring under any version of the standard", False)],
    "This tests understanding that CVSS has multiple score types for different purposes — Base (universal, vendor-set), Temporal (time-sensitive factors like exploit maturity), and Environmental (organization-specific). Both the auditor's need for a standard reference score AND the analyst's need for context-adjusted prioritization can be legitimate simultaneously, for different audiences.",
    difficulty=5)

add(VM, "CVSS / Prioritization",
    "A newly published vulnerability affects a product your organization uses, but your version is two major releases behind and the vendor's advisory only tested against the current release line. What is the MOST appropriate next step, rather than assuming the finding does or doesn't apply?",
    [("Assume the older version is unaffected since the advisory doesn't explicitly mention it", False),
     ("Assume the older version is definitely affected and immediately declare a critical incident without further verification", False),
     ("Review the vendor's changelog/release notes for the vulnerable code path to determine whether it exists in the older version, or directly test/contact the vendor for clarification, before committing to a remediation priority", True),
     ("Ignore the advisory entirely since it doesn't name your exact version", False)],
    "Advisories often only test/document against currently supported versions, but that doesn't mean older versions are unaffected (the vulnerable code may have existed for years) or automatically affected (the vulnerable code path might have been introduced later). Verification, not assumption in either direction, is the correct step.",
    difficulty=4)

add(VM, "Remediation",
    "A critical vulnerability affects a public-facing web application. The development team says a proper code fix will take three weeks due to the complexity of the affected authentication module. What is the MOST appropriate immediate action while the permanent fix is developed?",
    [("Take the application offline entirely for three weeks with no interim mitigation needed", False),
     ("Do nothing and simply wait the three weeks, since CVSS alone doesn't justify faster action", False),
     ("Deploy a virtual patch (e.g., a WAF rule or IPS signature specifically targeting the known exploit pattern) to reduce risk during the development window, while continuing to track the permanent fix", True),
     ("Permanently accept the risk with no further action since a fix is already planned", False)],
    "Virtual patching (WAF/IPS rules targeting the specific exploit pattern) is the standard interim risk-reduction measure for vulnerabilities that can't be immediately code-fixed, especially on internet-facing assets — it doesn't replace the real fix but meaningfully reduces exposure during the gap.",
    difficulty=3)

add(VM, "Remediation",
    "A risk acceptance was granted for a vulnerability 14 months ago with a documented 90-day review date that was never followed up on. What is the MOST significant governance failure this represents?",
    [("None — once an exception is granted, it is permanent and needs no further action by design", False),
     ("The exception process itself may have been followed correctly at approval time, but the LACK of a review/expiration enforcement mechanism means residual risk could have silently grown (e.g., new exploits, changed exposure) without anyone re-evaluating whether the original justification still holds", True),
     ("This is entirely the fault of the original vulnerability scanner vendor", False),
     ("Risk acceptances do not require review dates under any well-run vulnerability management program", False)],
    "A review date that's never enforced defeats the purpose of having one — risk conditions change (new exploits released, business context shifts, exposure changes), and a stale, unreviewed exception can leave an organization exposed well beyond what was originally assessed as acceptable.",
    difficulty=4)

add(VM, "Remediation",
    "A container base image update fixes a critical CVE, but the organization's CI/CD pipeline only rebuilds images on a source-code change, not on base-image updates. What operational gap does this reveal, and what's the fix?",
    [("There is no gap; base images never need to be rebuilt once deployed", False),
     ("The pipeline needs a mechanism (e.g., scheduled/triggered rebuilds on base-image updates, or automated dependency-update tooling) to rebuild and redeploy images when the BASE image changes, not only on application code changes — otherwise base-image CVE fixes never actually reach production", True),
     ("The fix is to abandon containers and move back to traditional VMs", False),
     ("The fix is to manually patch each running container's filesystem in place going forward", False)],
    "This is a common real-world gap: pipelines triggered only by app code changes will never pick up base image security fixes unless explicitly configured to also rebuild on base-image updates. In-place patching of ephemeral containers doesn't scale and gets overwritten on next deploy.",
    difficulty=4)

add(VM, "Remediation",
    "Which of the following is NOT an appropriate compensating control for a critical vulnerability on an unpatchable, EOL medical device that cannot be taken offline?",
    [("Network segmentation restricting which hosts can communicate with the device", False),
     ("Enhanced monitoring/IDS signatures scoped to that device's expected traffic pattern", False),
     ("Manually lowering the recorded CVSS score in the vulnerability management tool so the finding no longer appears as critical in reports", True),
     ("Strict access control limiting which accounts/workstations can reach the device's management interface", False)],
    "Segmentation, targeted monitoring, and access control are all legitimate compensating controls that actually reduce risk. Altering the recorded score to make a report look better doesn't change the underlying risk at all — it's a reporting integrity violation, not a control, and this is the kind of 'looks like an option but isn't legitimate' distractor the real exam uses.",
    difficulty=3)

add(VM, "Compliance / Reporting",
    "Under PCI DSS, an organization's quarterly external ASV scan comes back with a finding that the ASV marks as a 'failing' vulnerability, but the organization believes a compensating control fully mitigates it. What is the correct path to formally resolve this for compliance purposes?",
    [("Simply note the disagreement internally and file the scan as passing with no further action", False),
     ("Submit the compensating control as part of a formal exception/attestation process with the ASV or acquiring bank as PCI DSS requires, since ASV scan results generally cannot be self-overridden by the merchant", True),
     ("Switch to a different ASV until one returns a passing result with no changes made", False),
     ("PCI DSS has no mechanism for compensating controls; the vulnerability must always be fully remediated with no exceptions", False)],
    "PCI DSS does have a formal compensating control worksheet/attestation process, but it must go through the proper documented channel (ASV/acquirer), not be self-declared as resolved internally, and 'ASV shopping' for a passing result isn't a legitimate compliance strategy.",
    difficulty=4)

add(VM, "Compliance / Reporting",
    "A healthcare organization's risk analysis (required under the HIPAA Security Rule) identifies a critical vulnerability in a system that does NOT process, store, or transmit ePHI. How does this affect the organization's HIPAA-driven remediation obligation for that specific finding?",
    [("HIPAA obligates identical urgency for every vulnerability in the environment regardless of ePHI involvement", False),
     ("HIPAA's Security Rule obligations are specifically scoped to safeguarding ePHI, so a system with no ePHI involvement falls outside HIPAA's direct remediation mandate for that finding — though it may still warrant remediation under the organization's general security policy for other reasons", True),
     ("The finding can be ignored entirely with no security policy applying to it at all", False),
     ("HIPAA requires the system to be immediately decommissioned regardless of its function", False)],
    "HIPAA Security Rule obligations are scoped to protecting ePHI specifically — a vulnerability on a system genuinely outside the ePHI boundary isn't a HIPAA compliance driver for that finding, though good general security practice would still likely call for remediation under the org's own policy, just not as a HIPAA mandate.",
    difficulty=4)

add(VM, "Compliance / Reporting",
    "A regulator's rule requires reporting 'critical vulnerabilities on regulated systems' within 5 business days of discovery. An organization discovers a critical finding on a Friday evening but doesn't formally log it in their tracking system until the following Tuesday. When does the reporting clock legally begin?",
    [("Tuesday, when it was formally logged in the tracking system", False),
     ("Generally, from the point of actual organizational awareness/discovery (Friday), not from when it was administratively logged — delaying formal logging does not delay the regulatory clock", True),
     ("The following Monday, since weekends never count under any regulatory framework", False),
     ("Whenever the organization's legal team decides is most convenient", False)],
    "Regulatory awareness clocks generally start at actual discovery/awareness, not administrative processing delays — an organization can't reset or extend a reporting deadline simply by delaying when something gets formally logged internally.",
    difficulty=4)

add(VM, "Compliance / Reporting",
    "A vulnerability management program reports 100% of critical findings remediated within SLA for the past four quarters. An auditor discovers the program achieved this by reclassifying difficult-to-remediate critical findings as 'high' severity instead, which carries a longer SLA. What integrity issue does this illustrate?",
    [("This is a legitimate and encouraged practice for managing SLA compliance", False),
     ("Manipulating severity classification to hit a reporting metric undermines the entire purpose of risk-based prioritization and produces misleading metrics that could cause leadership to underestimate actual organizational risk", True),
     ("This has no effect on actual risk since the vulnerabilities are still being tracked somewhere", False),
     ("Only external auditors are capable of assigning severity ratings, so this scenario is impossible", False)],
    "This is a classic metrics-gaming problem: optimizing for the reported number instead of the underlying risk defeats the purpose of the metric entirely and can leave leadership with a dangerously false sense of security about actual exposure.",
    difficulty=4)

# ======================= INCIDENT RESPONSE AND MANAGEMENT =======================

add(IR, "IR Lifecycle",
    "During the Containment, Eradication, and Recovery phase of a NIST-based IR process, an analyst discovers a second, previously unknown compromised host while working to eradicate the first. What is the MOST appropriate action?",
    [("Ignore the second host until eradication and recovery are fully completed on the first host", False),
     ("Loop back into Detection & Analysis for the newly discovered host to scope and understand it, while continuing appropriate containment across the now-expanded incident, rather than treating the phases as strictly linear and one-directional", True),
     ("Declare the incident closed since the original host has been identified", False),
     ("Start an entirely separate, unrelated IR process with no connection to the original incident", False)],
    "NIST's phases aren't strictly linear in practice — new discoveries during containment/eradication often require looping back to detection/analysis for the newly found scope before proceeding, all within the same overall incident, since it's very likely related to the same root cause.",
    difficulty=4)

add(IR, "IR Lifecycle",
    "An IR team fully eradicates malware and restores systems from clean backups, but skips a formal lessons-learned review because 'the incident is over and everyone wants to move on.' What is the MOST significant long-term risk of skipping this step?",
    [("There is no risk; lessons-learned reviews are a purely ceremonial step with no practical value", False),
     ("Without capturing what allowed the incident to occur and how effectively the response actually performed, the same root cause and any process gaps are likely to recur in a future incident, since Preparation never gets updated with the new information", True),
     ("Skipping this step guarantees the same attacker will be legally prosecuted faster", False),
     ("This step is only required for incidents that involve law enforcement", False)],
    "Lessons-learned directly feeds back into the Preparation phase — skipping it means the root cause, detection gaps, and response friction points identified during this incident never get addressed, making a recurrence (or a similarly slow future response) far more likely.",
    difficulty=3)

add(IR, "IR Lifecycle",
    "During short-term containment of an active compromise, the IR lead must choose between (A) immediately isolating the affected VLAN, likely disrupting a production system mid-transaction, or (B) waiting 20 minutes for pending transactions to complete before isolating. Which factor should PRIMARILY drive this decision?",
    [("Always choose option A regardless of context, since any delay in containment is unacceptable under all circumstances", False),
     ("A risk-based judgment weighing the likely rate/impact of continued compromise spread during the 20-minute window against the business/data-integrity cost of an abrupt mid-transaction disruption — this is a documented, deliberate tradeoff decision, not a fixed rule", True),
     ("Always choose option B regardless of context, since business continuity always outweighs security containment", False),
     ("This decision should be made unilaterally by the affected business unit with no IR involvement", False)],
    "Containment decisions genuinely involve weighing active-spread risk against business impact — there's no universal 'always contain instantly' or 'always protect the transaction' rule. The IR lead (often with input from business stakeholders) makes and documents this judgment call based on the specifics of the incident.",
    difficulty=4)

add(IR, "IR Lifecycle",
    "A tabletop exercise reveals that no one on the IR team actually knows who has legal authority to approve paying a ransomware demand if it ever came to that. What TYPE of gap does this reveal, and what is the appropriate fix?",
    [("A purely technical detection gap that should be fixed by buying a new EDR tool", False),
     ("A governance/decision-authority gap in the IR plan — the plan should explicitly document who holds decision authority for major business decisions during an incident (ransom payment, public disclosure, shutting down production) before an actual incident forces the question under pressure", True),
     ("This is not a real gap since ransom payment decisions are always made instantly by whoever is on the call", False),
     ("This can only be resolved by law enforcement, never internally", False)],
    "Tabletop exercises are specifically designed to surface exactly this kind of governance gap — decision authority for major, non-technical calls (ransom payment, disclosure timing, production shutdown) needs to be pre-defined in the IR plan, not improvised during a live crisis.",
    difficulty=3)

add(IR, "IR Lifecycle",
    "An incident's root cause is eventually traced to a vulnerability that had a critical CVSS score and was flagged by vulnerability management five months before exploitation, but remained unpatched due to a missed internal deadline. Where should this specific finding be recorded in the incident's documentation?",
    [("It should be omitted from the report since it reflects poorly on the vulnerability management team", False),
     ("It should be documented in root cause analysis as part of lessons learned, since understanding WHY a known, already-flagged risk went unaddressed is essential to preventing recurrence — this is exactly the kind of finding lessons-learned exists to surface", True),
     ("It is irrelevant to the incident report since the vulnerability management team is a separate department", False),
     ("It should only be shared with the CISO privately and never included in any written incident documentation", False)],
    "Root cause analysis exists precisely to surface uncomfortable but important findings like a known, already-flagged risk that went unaddressed due to a process failure — omitting it defeats the entire purpose of the lessons-learned process and all but guarantees the same gap persists.",
    difficulty=3)

add(IR, "Attack Frameworks",
    "An intrusion shows: initial phishing email delivery, a malicious macro executing a downloader, the downloader fetching a second-stage RAT, the RAT establishing a scheduled-task persistence mechanism, followed by credential dumping via LSASS access. Using the Cyber Kill Chain, which stage does the 'scheduled-task persistence mechanism' step correspond to?",
    [("Weaponization", False),
     ("Installation", True),
     ("Actions on Objectives", False),
     ("Delivery", False)],
    "In the Cyber Kill Chain, Installation is the stage where the attacker establishes persistence (e.g., a scheduled task, registry run key, or service) after successful Exploitation — distinct from Weaponization (pairing exploit + payload before delivery) and Actions on Objectives (the attacker's ultimate goal, like exfiltration).",
    difficulty=4)

add(IR, "Attack Frameworks",
    "In MITRE ATT&CK terms, an adversary using a valid, stolen VPN credential to log into the corporate network (with no exploit or malware involved) is BEST classified under which tactic?",
    [("Initial Access, specifically via the Valid Accounts technique", True),
     ("Exploitation for Client Execution", False),
     ("Command and Control", False),
     ("Impact", False)],
    "MITRE ATT&CK explicitly categorizes logging in with valid (often stolen/purchased) credentials as Initial Access via the 'Valid Accounts' technique — no exploit or malware is required for this technique, which is exactly why it's a common, hard-to-detect entry method.",
    difficulty=4)

add(IR, "Attack Frameworks",
    "A ransomware group exfiltrates 200GB of sensitive data over several days via a legitimate, allow-listed cloud backup client already present on the network, BEFORE deploying the actual file-encrypting payload. Why would attackers deliberately choose this sequence and method?",
    [("It's random and has no strategic advantage over any other order or tool choice", False),
     ("Exfiltrating first (via a trusted/allow-listed tool that blends into normal traffic) both maximizes double-extortion leverage before detection likely occurs at encryption time, and reduces the chance the exfiltration itself gets flagged as anomalous, compared to using an unfamiliar exfil tool", True),
     ("Encryption must always occur before exfiltration under every modern ransomware playbook", False),
     ("This sequence is used exclusively by nation-state actors and never by financially motivated criminal groups", False)],
    "This reflects real modern double-extortion tradecraft: exfiltrate quietly using trusted/allow-listed tools first (harder to detect, maximizes leverage before the loud, obvious encryption event likely triggers a response), THEN encrypt — encryption is often what finally gets noticed, by which point the data is already gone.",
    difficulty=4)

add(IR, "Digital Forensics",
    "An analyst images a suspect drive using a write blocker, calculates a SHA-256 hash of the image, and later needs to run keyword searches across the image using forensic software that requires mounting it. What must be true of this analysis step to preserve evidentiary integrity?",
    [("The original evidence drive must be mounted directly using the forensic software", False),
     ("Analysis must be performed against a working COPY of the image (verified against the original hash), never the original evidence drive or the sole master image, so the source of truth remains untouched and available for re-verification", True),
     ("Hashing is only required once, at the very end of the entire investigation", False),
     ("Write blockers are only necessary during the initial imaging step and serve no purpose afterward", False)],
    "Best practice is to work exclusively from verified copies for all analysis, keeping the original evidence (and often a master image) untouched and available to re-verify integrity at any point — mounting/analyzing the original risks exactly the kind of alteration chain of custody exists to prevent.",
    difficulty=4)

add(IR, "Digital Forensics",
    "During memory analysis, an analyst finds a process with a name matching a legitimate system process (`scvhost.exe` — note the transposed letters vs. the real `svchost.exe`) running from an unusual directory. What forensic technique category does spotting this specific detail represent?",
    [("Static malware analysis", False),
     ("Process/masquerading detection through careful verification of process name, path, and signature against known-good baselines — attackers commonly use near-identical names to blend in with legitimate system processes", True),
     ("Chain of custody documentation", False),
     ("Order of volatility assessment", False)],
    "Malware frequently masquerades using names that are visually near-identical to legitimate system processes (typosquatting at the process level). Catching this requires actively verifying process name, file path, and digital signature against known-good baselines rather than trusting a name at a glance.",
    difficulty=4)

add(IR, "Digital Forensics",
    "An organization's log retention policy keeps detailed logs for only 30 days, but forensic analysis six weeks after initial compromise determines the actual initial access occurred 45 days prior. What is the MOST direct consequence for the investigation?",
    [("No consequence; forensic tools can always reconstruct data older than the retention window from RAM alone", False),
     ("The earliest-stage evidence (initial access vector, earliest attacker activity) may be permanently unavailable, potentially leaving root cause determination incomplete or based on inference rather than direct evidence — this is a strong argument for retention policies aligned with realistic dwell-time expectations", True),
     ("This has no bearing on the investigation's outcome since eradication doesn't require knowing the initial access vector", False),
     ("Retention policy only affects compliance reporting, never forensic capability", False)],
    "This connects log retention policy directly to forensic capability and to the Reporting/Communication domain's concern with dwell time — if retention is shorter than realistic attacker dwell time, the earliest and often most diagnostically important evidence simply won't exist by the time it's needed.",
    difficulty=4)

add(IR, "Communication & Legal",
    "An incident involves a suspected nation-state actor and evidence of long-term persistent access to critical infrastructure control systems. Beyond internal legal counsel, which additional coordination is MOST likely appropriate given the nature of this specific incident?",
    [("No external coordination is ever appropriate for any incident regardless of severity or sector", False),
     ("Coordination with relevant government/sector-specific agencies (e.g., CISA, sector ISACs, or law enforcement) given the critical infrastructure and suspected nation-state involvement, which often carries both national security interest and potential legal reporting obligations beyond typical breach law", True),
     ("Only the marketing department needs to be involved, with no other stakeholders", False),
     ("This should be handled identically to a routine phishing incident with no additional escalation", False)],
    "Critical infrastructure incidents with suspected nation-state involvement typically trigger sector-specific and national-security-relevant reporting/coordination obligations (e.g., CISA, ISACs, law enforcement) well beyond a standard consumer data breach scenario — the severity and sector materially change the appropriate response.",
    difficulty=4)

add(IR, "Communication & Legal",
    "Legal counsel instructs the IR team to label all internal incident findings as 'prepared in anticipation of litigation' and to route communications through counsel. What is the PRIMARY purpose of this instruction from an IR perspective?",
    [("To prevent the IR team from doing any further technical investigation", False),
     ("To attempt to preserve attorney-client privilege / work-product protection over sensitive investigative findings, which can affect what must later be disclosed in litigation or regulatory proceedings — while the technical investigation itself still proceeds normally", True),
     ("To make the incident officially closed with no further action required", False),
     ("This instruction has no legal or practical significance and can be safely ignored by the IR team", False)],
    "This is a real and common practice — routing sensitive findings through counsel is intended to preserve privilege protections over investigative work product, which can matter significantly in later litigation or regulatory scrutiny. It does not mean the technical investigation stops; it affects how findings are documented and communicated.",
    difficulty=4)

add(IR, "Communication & Legal",
    "A third-party SaaS vendor notifies your organization of a breach on their side that may have exposed data your organization stored with them. Your organization's own contract with the vendor is silent on incident notification timelines. What should guide your organization's OWN downstream notification obligations to your affected customers?",
    [("Since the vendor contract is silent, your organization has no notification obligation at all, regardless of any other factor", False),
     ("Your organization's own regulatory/legal obligations (e.g., applicable breach notification laws based on the type of data and affected individuals' jurisdictions) still apply independently of what the vendor contract says — a silent contract doesn't erase your organization's own separate legal duty to affected individuals", True),
     ("Only the vendor has any notification obligation; your organization is fully insulated by outsourcing data storage to a third party", False),
     ("Notification obligations only ever apply to the original party that suffered the technical breach, never downstream data owners", False)],
    "Outsourcing data storage doesn't outsource your organization's own legal obligations to the individuals whose data you're responsible for — applicable breach notification laws are typically triggered by the exposure of covered data regardless of whose infrastructure it happened on, and a silent vendor contract doesn't erase that.",
    difficulty=5)

add(IR, "Communication & Legal",
    "During active ransomware negotiation led by a specialized third-party negotiation firm, what is the MOST appropriate role for the internal IR/security team during that specific window?",
    [("Step back entirely and have no involvement in the incident whatsoever until negotiation concludes", False),
     ("Continue technical containment, eradication scoping, and forensic investigation in parallel, since negotiation and technical response are complementary tracks — technical work should not pause just because negotiation is underway", True),
     ("Personally take over negotiation from the specialized firm since IR staff are always better positioned to negotiate", False),
     ("Immediately pay the ransom directly without waiting for the negotiation firm's involvement to conclude", False)],
    "Negotiation (typically handled by specialists familiar with threat actor behavior/legal considerations) and technical incident response are parallel, complementary tracks — pausing technical containment/investigation while negotiation proceeds needlessly extends exposure and delays recovery readiness.",
    difficulty=3)

# ======================= REPORTING AND COMMUNICATION =======================

add(RC, "Metrics",
    "A SOC's dwell time metric improved from 30 days to 4 days after deploying a new EDR platform. However, the number of confirmed incidents reported per quarter INCREASED by 300% in that same period. What is the MOST likely, and most defensible, interpretation to present to leadership?",
    [("The organization is being attacked 300% more often because of the new EDR platform itself", False),
     ("Improved detection capability is very likely surfacing incidents that were previously going undetected entirely (reflected in the old, much longer dwell time), rather than reflecting an actual 300% increase in attack volume", True),
     ("The metrics are contradictory and one of them must be measured incorrectly", False),
     ("Dwell time and incident count are unrelated and this correlation is coincidental with no reasonable explanation", False)],
    "This is a classic 'detection paradox' — better tooling doesn't cause more attacks, it reveals previously invisible ones. A dramatic dwell-time drop alongside a reported-incident spike right after a detection upgrade should be interpreted as improved visibility, not a genuine surge in attacker activity, and reported to leadership with that context to avoid unwarranted panic.",
    difficulty=4)

add(RC, "Metrics",
    "Which pairing of metrics, if reported TOGETHER, gives leadership the clearest signal about whether SOC analysts are being overwhelmed by alert volume, as opposed to reporting either metric alone?",
    [("Total number of firewalls deployed and total number of employees in the company", False),
     ("Alert volume/false-positive rate alongside mean time to acknowledge (MTTA) new alerts — a rising false-positive rate combined with slowing MTTA together indicate genuine alert fatigue, whereas either alone could have other explanations", True),
     ("Company revenue and marketing budget", False),
     ("Number of vulnerability scans run per month and average scan duration", False),
     ],
    "Neither metric alone tells the full story — a high false-positive rate alone could just mean tuning is needed without necessarily causing delays, and slow MTTA alone could stem from staffing changes unrelated to volume. Seeing BOTH move together (more noise + slower acknowledgment) is a much stronger, more defensible signal of genuine analyst overload.",
    difficulty=4)

add(RC, "Metrics",
    "A vulnerability management report shows 'average CVSS score of open findings' trending downward quarter over quarter. Why might this metric alone be a MISLEADING indicator of actual risk reduction?",
    [("Average CVSS score is always a perfectly accurate, complete measure of organizational risk with no blind spots", False),
     ("A shrinking average could be driven simply by closing easy, low-effort, low-severity findings quickly while a small number of high-severity, hard-to-fix critical vulnerabilities linger unaddressed and drag out over many quarters — the average masks this concentration of real risk", True),
     ("CVSS scores are recalculated to decrease automatically over time regardless of remediation activity", False),
     ("This metric cannot mathematically trend downward under any circumstances", False)],
    "Averages can hide exactly the risk that matters most: if the hardest, highest-severity vulnerabilities are the ones NOT getting fixed while easy ones get cleared quickly, the average can look like it's improving while the organization's actual worst-case exposure stays flat or even grows. This is why trend reporting should pair averages with severity-tier-specific SLA compliance, not rely on the average alone.",
    difficulty=5)

add(RC, "Stakeholder Communication",
    "A CFO asks 'how much financial risk does this vulnerability actually represent to us?' What is the MOST appropriate way for a security analyst to frame the answer, given that CVSS does not natively express risk in monetary terms?",
    [("Refuse to answer since CVSS cannot be converted to a dollar figure under any circumstances", False),
     ("Translate technical severity and likelihood into business impact terms — potential operational disruption, likely regulatory exposure, and rough order-of-magnitude cost ranges based on similar incidents or a recognized risk-quantification approach — while being transparent about the inherent uncertainty of the estimate", True),
     ("State the CVSS score alone (e.g., '9.8') and consider the question fully answered", False),
     ("Provide a single precise dollar figure with no caveats, presented as a guaranteed and certain financial outcome", False)],
    "CFOs need business-framed risk (operational, regulatory, financial exposure), not raw technical scores — but a credible answer also acknowledges uncertainty rather than presenting a speculative figure as a guaranteed fact. Frameworks like FAIR (Factor Analysis of Information Risk) exist specifically to help bridge this technical-to-financial translation.",
    difficulty=4)

add(RC, "Stakeholder Communication",
    "A technical incident report includes the line: 'The attacker likely used a zero-day, though this has not been confirmed.' A junior analyst wants to remove the word 'likely' to make the report sound more authoritative and decisive. Why should this qualifying language be preserved?",
    [("Because reports should always sound as uncertain as possible regardless of actual confidence", False),
     ("Because clearly distinguishing confirmed facts from working hypotheses is essential for accurate decision-making by readers (including legal and executive stakeholders) — removing appropriate uncertainty markers to sound more authoritative can lead to decisions based on an unconfirmed claim treated as established fact", True),
     ("Because using the word 'likely' has no bearing on how the report will be interpreted by any reader", False),
     ("Because legal counsel is required by law to reject any report containing hedged language", False)],
    "Precision about confidence level is a core reporting discipline — stripping out appropriate hedging to sound more decisive can cause readers (especially legal, regulatory, or executive stakeholders making real decisions) to treat an unconfirmed hypothesis as an established fact, with real consequences if it later proves wrong.",
    difficulty=4)

add(RC, "Regulatory Reporting",
    "A breach affects individuals across three different US states with three different breach notification laws, each with different timelines and different definitions of what counts as 'personal information.' What is the correct approach to determining notification obligations?",
    [("Apply only the notification law of the state where the company is headquartered, regardless of where affected individuals live", False),
     ("Individually evaluate obligations under EACH applicable state's law based on where affected individuals reside, since breach notification laws are generally determined by the residency of the affected individual, not the company's location — and comply with the most stringent applicable timeline/requirement where obligations overlap for the same individual", True),
     ("Since the laws conflict, no notification is required from any jurisdiction until the conflict is resolved in court", False),
     ("Only the state with the shortest notification deadline needs to be followed for all affected individuals nationwide", False)],
    "State breach notification laws are generally triggered by the residency of the affected individual, not the company's home state — a multi-state breach typically requires evaluating and complying with each applicable state's requirements for its respective residents, which is exactly why multi-state breaches are notoriously complex to manage.",
    difficulty=5)

add(RC, "Regulatory Reporting",
    "An organization determines that only 480 individuals were affected by a breach of unsecured PHI, just under HIPAA's 500-person threshold for mandatory media notification. Does this mean media notification and HHS notification can both be skipped entirely?",
    [("Yes, both HHS notification and media notification are entirely optional below any threshold", False),
     ("No — affected individuals must still be notified, and HHS must still be notified (annually for breaches under 500, rather than within 60 days as required for 500+); only the MEDIA notification requirement is specifically tied to the 500-person threshold", True),
     ("Yes, HIPAA breach notification obligations only exist once a breach affects 500 or more individuals", False),
     ("No, all three notification types remain mandatory on the exact same timeline regardless of the individual count", False)],
    "This tests a precise, easy-to-get-wrong detail: the 500-person threshold specifically changes the HHS reporting TIMELINE (immediate/60-day vs. annual log) and triggers the MEDIA notification requirement — it does not eliminate the underlying obligation to notify affected individuals and HHS at all, which applies regardless of count.",
    difficulty=5)

add(RC, "Regulatory Reporting",
    "A regulator's rule requires notification 'without undue delay and in any event within 72 hours of becoming aware' of a qualifying breach. An organization becomes aware of suspicious activity at 11:00 PM Friday but doesn't confirm it meets the legal definition of a 'breach' (as opposed to a contained, unsuccessful attempt) until Monday morning. When does the 72-hour clock begin?",
    [("Friday at 11:00 PM, the moment any suspicious activity was first noticed, regardless of whether it was later confirmed as a qualifying breach", False),
     ("Generally, from the point the organization has enough information to reasonably conclude a qualifying breach (as legally defined) has actually occurred — not from the first moment of raw suspicion, though organizations should document this determination timeline carefully since it will likely be scrutinized", True),
     ("The clock never starts until the organization's insurance company approves the breach determination", False),
     ("Monday morning by default, regardless of when awareness of the actual breach determination occurred", False)],
    "This is a genuinely nuanced, frequently tested distinction: 'awareness' generally means awareness of a qualifying breach as legally defined, not the first moment of raw suspicion — but the determination process itself needs to be reasonable and well-documented, since regulators scrutinize whether an organization dragged its feet on making that determination.",
    difficulty=5)

# ======================= EXTRA: rounding out VM / IR / RC =======================

add(VM, "Scanning Methodology",
    "A scan is configured with an aggressive timing template to finish faster during a shortened maintenance window. Halfway through, several IoT badge readers on the scanned segment stop responding and require a physical power cycle. What does this reveal about the tradeoff that was made?",
    [("Aggressive timing templates have no relationship to target stability and this must be an unrelated coincidence", False),
     ("Scan speed/timing settings directly trade off against the risk of overwhelming fragile, low-resource devices — a faster template increases the chance of destabilizing constrained IoT/embedded devices, so timing should be tuned to the FRAGILITY of the target population, not just the size of the maintenance window", True),
     ("IoT devices should never be included in any vulnerability scan under any configuration", False),
     ("This proves the scanning tool itself is defective and must be replaced", False)],
    "Timing/aggressiveness settings are a real engineering tradeoff: faster scans finish sooner but send more concurrent probes, which constrained embedded/IoT devices may not handle gracefully. The window's length shouldn't be the only factor driving timing choice — the fragility of what's being scanned matters just as much.",
    difficulty=4)

add(VM, "CVSS / Prioritization",
    "A finding has a CVSS Temporal score lower than its Base score because the 'Remediation Level' metric reflects an official vendor patch now being available, and 'Report Confidence' is confirmed. How should the falling Temporal score (relative to Base) be interpreted?",
    [("The vulnerability has become less severe on the target system now that time has passed", False),
     ("The Temporal metrics reflect that the SITUATION around the vulnerability has matured favorably (a fix now exists, confirmed details are known) — this generally argues for MORE urgency to apply the now-available fix, not less, even though the numeric score itself decreased", True),
     ("A decreasing Temporal score always means the finding can be safely closed with no action", False),
     ("Temporal score changes are purely cosmetic and carry no operational meaning", False)],
    "This is a genuinely counterintuitive nuance: Temporal score components can move the numeric score down as remediation options mature (patch available, confirmed reporting) — but that's actually the point where action becomes easiest and most urgent to take, not a signal to deprioritize. A lower Temporal score isn't the same as 'lower priority.'",
    difficulty=5)

add(VM, "Remediation",
    "An organization's patch management process requires all patches to pass a 2-week regression testing cycle before production deployment, with no exception process defined. A critical, actively-exploited-in-the-wild vulnerability is disclosed with a same-day vendor patch. What is the MOST significant process gap this scenario exposes?",
    [("Regression testing before deployment is itself an unnecessary step that should be eliminated entirely", False),
     ("The absence of an expedited/emergency patching exception path for active-exploitation scenarios means the standard process, appropriate for routine patches, becomes a liability when speed is critical — mature patch management needs a defined fast-track alongside the standard cycle", True),
     ("The vendor should be blamed for releasing the patch too quickly after disclosure", False),
     ("This scenario has no real gap since 2 weeks is always an acceptable timeframe for every vulnerability regardless of exploitation status", False)],
    "A single rigid process for all patches is itself the gap — mature vulnerability/patch management defines a separate expedited path (abbreviated testing, compensating controls in the interim, executive sign-off) for actively-exploited critical vulnerabilities, rather than forcing every patch through the same full-length cycle regardless of urgency.",
    difficulty=4)

add(VM, "Compliance / Reporting",
    "An organization scopes its annual PCI DSS assessment to exclude a subnet that stores tokenized (not raw) cardholder data, reasoning that tokenization removes it from PCI scope entirely. A finding surfaces that the tokenization vendor's de-tokenization API is reachable from that subnet with weak access controls. What does this reveal about the scoping decision?",
    [("Tokenization always fully removes a system from PCI DSS scope with no further consideration required", False),
     ("If a system can reach a de-tokenization function that could reveal raw cardholder data, it may still fall within PCI DSS scope depending on how tightly that access is controlled — scoping decisions based on tokenization need to account for what the system can actually reach and do, not just what data it stores at rest", True),
     ("This finding is irrelevant to PCI DSS since tokenized data is never considered cardholder data under any circumstances", False),
     ("The subnet should be immediately disconnected from the network permanently with no further evaluation", False)],
    "Tokenization can reduce PCI scope, but scope isn't just about what's stored at rest — a system with a reachable path to de-tokenization (especially with weak controls) may still be in-scope, since it has effective access to the raw data via that function. This tests against an overly simplistic 'tokenized = out of scope, full stop' assumption.",
    difficulty=5)

add(IR, "IR Lifecycle",
    "Twelve hours into an active incident, the IR lead is asked by an executive for a firm 'time to full resolution' estimate. The scope is still not fully understood. What is the MOST professionally appropriate response?",
    [("Provide a precise, confident timeline regardless of actual certainty, since executives always require an exact answer", False),
     ("Explain that scope is still being determined, provide the best current estimate range with explicit assumptions and confidence level, and commit to a specific time for the next update — rather than fabricating false precision", True),
     ("Refuse to provide any information at all until the incident is completely over", False),
     ("Defer the question entirely to the marketing department", False)],
    "Giving false precision to satisfy pressure for an answer often backfires when reality diverges from the fabricated estimate, damaging credibility further. The professional approach is transparent uncertainty with a real range, clear assumptions, and a firm commitment to when the next update will come.",
    difficulty=3)

add(IR, "Attack Frameworks",
    "An adversary is observed using a technique where they modify a legitimate scheduled task's existing trigger conditions rather than creating a brand-new scheduled task. Why might an experienced adversary specifically prefer modifying an existing task over creating a new one, from a detection-evasion standpoint?",
    [("Modifying an existing task is technically impossible, so this scenario could not actually occur", False),
     ("New scheduled task creation is a commonly monitored/alerted event in many environments, whereas modification of an already-existing, previously-trusted task may not trigger the same detection rules — blending into 'normal' infrastructure rather than adding something new that stands out", True),
     ("This technique has no detection-evasion benefit whatsoever compared to creating a new task", False),
     ("Only new task creation is considered a MITRE ATT&CK technique; modification is not covered by any framework", False)],
    "Many detection rules specifically watch for NEW scheduled task creation events, since that's an intuitive persistence indicator. A sophisticated adversary modifying an existing, already-trusted task can blend in below that specific detection threshold — a good example of why understanding what a detection rule actually covers (and doesn't) matters for both defense and hunting.",
    difficulty=5)

add(IR, "Digital Forensics",
    "A forensic analyst calculates MD5 and SHA-256 hashes for an acquired evidence image. Given that MD5 is cryptographically broken (collision attacks are feasible), why do many forensic labs still record it ALONGSIDE SHA-256 rather than dropping it entirely?",
    [("MD5 is actually more cryptographically secure than SHA-256 and should be the primary hash used", False),
     ("MD5 is retained largely for backward compatibility/cross-referencing with older case records, tools, and legal precedent that used MD5, while SHA-256 serves as the actual cryptographically robust integrity guarantee going forward — not because MD5 alone is still considered adequate integrity protection", True),
     ("Recording two hashes is purely a formality with no practical justification of any kind", False),
     ("SHA-256 cannot be used for forensic evidence under any recognized standard", False)],
    "This tests a subtle, real-world practice: MD5's collision weakness means it should never be RELIED upon alone for integrity verification, but many labs still record it for continuity with historical case data, older tooling, and established chain-of-custody documentation practices, while treating SHA-256 as the actual integrity guarantee.",
    difficulty=4)

add(IR, "Communication & Legal",
    "A company's cyber insurance policy requires using an insurer-approved incident response firm for any claim related to a ransomware incident to be honored. The internal IR team, already deep into containment, discovers this requirement only after the incident has started. What is the MOST appropriate immediate action?",
    [("Ignore the insurance requirement entirely since the internal team is already engaged and switching now would be disruptive", False),
     ("Immediately notify the insurer and engage the required approved firm as soon as possible to preserve coverage eligibility, coordinating a handoff/collaboration with the internal team rather than discovering post-incident that the claim is denied on a technicality", True),
     ("Wait until the incident is fully resolved before ever contacting the insurer, to avoid the appearance of needing their help", False),
     ("Cancel the cyber insurance policy immediately since it created this complication", False)],
    "Missing a policy's procedural requirements (like using a pre-approved IR firm) is a common way real claims get denied, even when the underlying incident is legitimately covered. As soon as this is discovered, looping in the insurer and required firm promptly — even mid-incident — is far better than discovering a denied claim after the fact.",
    difficulty=4)

add(RC, "Metrics",
    "A monthly report shows 'total number of alerts triaged' increasing steadily, presented by the SOC manager as evidence of growing team productivity. What is the MOST important caveat missing from this framing?",
    [("No caveat is needed since alert volume is always a direct, unambiguous measure of team productivity", False),
     ("Without knowing what fraction of triaged alerts were true positives requiring real action versus noise/false positives, a rising raw alert count says as much about alert volume/tuning quality as it does about team output — productivity should be paired with a quality metric, not reported as a raw count alone", True),
     ("This metric should never be reported to any audience under any circumstances", False),
     ("Alert triage volume has a fixed, universal 'good' threshold that applies identically to every organization", False)],
    "A rising raw count can just as easily reflect worsening tuning (more noise to sift through) as it can reflect genuine team growth — without pairing it with a quality signal (true-positive rate, MTTA, escalation accuracy), the metric alone doesn't actually demonstrate productivity and can be actively misleading if presented that way.",
    difficulty=4)

add(RC, "Stakeholder Communication",
    "A vulnerability report bound for a development team lists a finding as 'SQL injection, CVSS 9.8, CWE-89.' The developers report back that they don't know where to start. What is the MOST likely reason this technically accurate report failed to be actionable?",
    [("The report contains too much technical detail and should have been simplified into pure business risk language instead", False),
     ("It's missing the specific technical detail developers actually need to act: the vulnerable endpoint/parameter, a proof-of-concept request demonstrating the injection, and the specific code location or pattern to fix — a CVSS score and CWE ID identify the CLASS of issue but not WHERE or HOW to fix it", True),
     ("SQL injection findings can never be meaningfully communicated in a written report under any circumstances", False),
     ("The finding should have been assigned to the network team instead of developers", False)],
    "A CVSS score and CWE classification correctly identify the type and severity of an issue but provide zero actionable location/reproduction detail — for a report to be useful to the team actually fixing the code, it needs the specific endpoint, parameter, and ideally a proof-of-concept, matching the earlier point about tailoring depth AND type of content to the audience's actual job.",
    difficulty=3)

add(RC, "Regulatory Reporting",
    "An organization operating in the EU experiences a breach affecting both EU residents and US residents. GDPR's 72-hour notification requirement and a US state's 30-day requirement both technically apply to different subsets of affected individuals. What is the correct approach?",
    [("Apply only the longer, more lenient 30-day timeline to all affected individuals across both jurisdictions", False),
     ("Apply each jurisdiction's specific requirement to its respective affected population — GDPR's 72-hour clock for EU residents' data and the applicable US state's 30-day requirement for its residents — since notification obligations are generally assessed per applicable law based on whose data and which jurisdiction is involved, not resolved by picking a single 'easiest' global standard", True),
     ("Since the timelines conflict, no notification is legally required for either group", False),
     ("Only GDPR applies globally to every affected individual regardless of residency once one EU resident is affected", False)],
    "Multi-jurisdiction breaches require assessing and complying with each applicable law for its respective affected population — there's no single global shortcut, and picking the most lenient timeline for everyone would leave the organization out of compliance with the stricter law's population-specific deadline.",
    difficulty=5)

print(f"Generated {len(Q)} questions")
os.makedirs("/home/claude/cysa-trainer/data", exist_ok=True)
with open("/home/claude/cysa-trainer/data/questions.json", "w") as f:
    json.dump(Q, f, indent=2)

# Validate
for q in Q:
    correct_count = sum(1 for c in q["choices"] if c["correct"])
    assert correct_count == q["select_n"], f"{q['external_key']}: expected {q['select_n']} correct, got {correct_count}"
    assert len(q["choices"]) >= 4, f"{q['external_key']}: fewer than 4 choices"
print("All questions validated OK")

from collections import Counter
print(Counter(q["domain"] for q in Q))
