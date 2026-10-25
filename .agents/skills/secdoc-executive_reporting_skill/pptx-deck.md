# PowerPoint deck conventions

The deck is presented, not read — every convention here assumes a presenter in the room and an audience that will remember one thing per slide at most. Produce it via the pptx skill; this file specifies content and structure conventions only, never document-generation mechanics.

## Slide titles are takeaway sentences

Titles state the message, never the topic. The title alone should carry the slide's meaning to someone flipping through the deck afterward.

- Wrong: "Cloud Spend Update"
- Right: "Cloud spend is 18% over plan, driven by two teams"
- Wrong: "Vendor Timeline"
- Right: "Vendor slip moves cutover to Aug 22 — two weeks past commitment"

If a takeaway title can't be written for a slide, the slide has no message; cut it or merge it.

## One message per slide

One finding, one decision, or one ask per slide. Supporting evidence on the slide serves that single message. If a slide needs two charts making two different points, it is two slides.

## Deck structure

1. **Executive summary slide, up front.** One slide that could be presented alone: bottom line, the two-to-four findings that matter, the ask. If the meeting gets cut to five minutes, this is the five minutes.
2. **Findings** — one per slide, takeaway titles, evidence beneath.
3. **Implications and recommendations** — what the findings mean and what to do, kept distinct from the findings themselves.
4. **The ask slide** — the decision or resource needed, owner, deadline. Skimmable in seconds.
5. **Backup / appendix section** — clearly marked, after the ask. Detail tables, methodology, the full source appendix (the ingestion inventory), and the answers to the questions the main deck will provoke. Build backup slides for the two or three questions the numbers most obviously invite.

## Charts vs. tables

- Chart when the point is a trend, a comparison, or a gap — the shape carries the message.
- Table when the point is precision — exact figures the audience needs to read, not estimate.
- Every chart is titled with its takeaway, axes labeled, and stripped of decoration that doesn't carry data. One chart per slide.

## Speaker notes carry the specifics

The slide stays clean; the speaker notes carry the supporting detail: exact figures, source IDs, as-of dates, the reasoning behind any conflict resolution, and the confidence caveats ("vendor-reported, not independently confirmed"). A presenter reading only the notes should be able to answer "where did that number come from?" for every figure on the slide.

## Provenance in a deck

Source IDs stay off the slide face — they live in the speaker notes and in the appendix's source inventory slide. Time-sensitive figures carry their as-of date on the slide itself in small text ("as of 7/31"), because a deck circulates for weeks after the meeting.

## Gaps and freshness

A slide never shows a plausible placeholder where the sources had no figure. If a template-obvious number is missing, the slide says "not available in provided sources" or the slide is restructured so the gap isn't load-bearing. Stale sources flagged during ingestion are either refreshed before the deck ships or flagged on the slide that uses them.

## Relationship to the other deliverables

In an "all three" run, the deck presents the Word report's narrative — same findings, same numbers, same ask. Slide titles map to the report's finding statements. Reconcile numbers across deliverables before shipping.
