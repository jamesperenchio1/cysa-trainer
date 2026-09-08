# Adding content

I write the content in chat sessions; you commit it. That's the workflow, and it works
fine — but it means volume is the constraint, so here's how to spend it well.

## The loop

1. Open `/progress`. The "next content to write" panel lists empty objectives, ordered by
   exam weight. Take the top one.
2. Start a Claude session and ask for it by name — for example:
   *"Write the lesson, flashcards and questions for objective 2.3, Analyze data to
   prioritize vulnerabilities, following docs/CONTENT-STANDARD.md. Long-form lesson."*
3. Save the JSON into `content/lessons/`, `content/flashcards/`, `content/questions/`.
4. `npm run validate` — fix anything it rejects, then `npm run seed`.
5. Commit and push. `docker compose up -d --build` on the box.

One objective per session is about right: a full lesson plus ten cards plus six questions
is a solid session's output and roughly a week of study material for you.

## Order

Follow exam weight, which is what `/progress` already sorts by. Security Operations is 34%
of the exam and five objectives, so it is where the first third of the work goes.

## What I can and can't guarantee

You said you can't tell good content from bad, and that's exactly why this matters.

**What I do:** every lesson and every question carries `sources` pointing at a free, public
primary document — NIST special publications, RFCs, MITRE ATT&CK, the FIRST CVSS
specification, vendor documentation — with a section or page locator. Not a vague
citation: a specific place you or anyone else can go and check the claim.

**What that gets you:** if something in here is wrong, it is checkable. The source links
render at the bottom of every lesson and under every explanation. When something feels
off, or when you eventually get access to a commercial bank or a study guide and it
contradicts this, follow the link and see who's right.

**What I can't do:** verify myself. No expert reviews this content. Technical detail from
memory — an event ID, a CVSS score, a specific field name — is where errors live, and the
citation makes it findable rather than making it correct. The gate in `npm run validate`
catches structural and style problems; it cannot catch a wrong fact.

That's the honest deal. It's better than an uncited bank and worse than a reviewed one.

## The standard

`docs/CONTENT-STANDARD.md` has the full authoring rules — the four difficulty mechanisms,
the distractor requirements, the format rules the gate enforces. Point Claude at it rather
than re-explaining every session.
