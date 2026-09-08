# Get the real objective list

This is the one job I can't do for you, and it's the most important file in the repo.

`content/blueprint.json` currently ships with `"provenance": "provisional"`. The four
domain names and their weights — Security Operations 34%, Vulnerability Management 26%,
Incident Response and Management 24%, Reporting and Communication 16% — are confirmed for
CS0-004. The objective numbering underneath them is reconstructed from the CS0-003
structure that V4 carried forward. It is close enough to organise study around, and not
close enough to trust a coverage percentage from.

## Ten minutes, free

1. Go to CompTIA's CySA+ certification page and find the exam objectives download for
   **CS0-004**. It asks for an email address rather than payment.
2. The PDF arrives by email as a download link, usually within a few minutes. Check spam
   before resubmitting — repeat submissions from one address get throttled.
3. Save it somewhere outside the repo. **Do not commit it.** This repo is public and the
   PDF is copyrighted; `.gitignore` already excludes `content/raw/`, so put it there if
   you want it on the box.
4. Open a Claude session, attach the PDF, and ask for `content/blueprint.json` rebuilt
   from it with `"provenance": "official"`. The schema is in `src/lib/schema.ts`.
5. `npm run validate && npm run seed`. The provisional banner disappears from the app.

## Why this matters more than it sounds

Every coverage percentage, every "you're weak at 2.3", and every generation target keys
off this file. If the objective list is wrong, the app will confidently tell you that you
have covered the exam when you have covered something adjacent to it. That is a worse
failure than having no tracking at all, because it feels like knowledge.

CS0-004 also added material that CS0-003 did not have — artificial intelligence in security
operations, and expanded cloud-native and hybrid coverage. The provisional list gestures at
these in objective 1.5 and 1.1, but the official one will name them properly, and they are
exactly the topics a reconstructed list is least reliable about.
