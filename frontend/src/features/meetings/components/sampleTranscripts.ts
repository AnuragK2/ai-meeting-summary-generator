/**
 * Inlined copies of `samples/*.txt` from the repo root so reviewers can
 * try the app with one click. The on-disk files remain the canonical
 * source for the README and for cURL examples; keep these in sync when
 * editing the originals (`samples/` directory at the repo root).
 */

export interface SampleTranscript {
  id: string;
  label: string;
  title: string;
  date: string;
  participants: string;
  text: string;
}

const PRODUCT_SYNC = `Product Sync — October 14, 2025
Attendees: Priya (PM), Marcus (Eng Lead), Jen (Design), Tomas (QA)

Priya: Thanks for joining. Today we need to lock in the beta launch date and decide whether onboarding ships v1 or v2.
Marcus: From engineering — v1 is ready and stable. v2 is about 60% done. If we wait for v2 we slip two weeks minimum.
Jen: From a design perspective v2 is the better experience, but v1 is acceptable for the beta cohort. I'd rather ship v1 now and follow up with v2 in November.
Priya: Okay, let's commit to shipping the beta with onboarding v1 on November 15. We'll cut v2 from beta scope.
Marcus: Agreed. I'll update the milestone in Linear today.
Priya: Tomas, can you put together a regression test plan for the beta build by Monday October 21?
Tomas: Yes, I'll have a draft by end of day Friday October 18 and finalize Monday.
Jen: One thing that's still open — what do we do about the empty state in the dashboard? We never decided on copy.
Priya: Good catch. Let's table that for a separate working session. Jen, can you set that up?
Jen: Sure. I'll send invites by tomorrow.
Marcus: Quick risk — the new auth service is gated behind a feature flag. If we hit unexpected load we may need to roll it back. We haven't done the load test yet.
Priya: That's important. Marcus, can you own the load test? Let's get it done before launch — no later than November 7. Mark it high priority.
Marcus: Will do.
Priya: Last thing — pricing page copy. Marketing wants final answers by next week. We still don't know if the free tier includes the export feature.
Marcus: That's a product decision, not engineering. Priya?
Priya: I'll think about it and circle back. Open question for now.
Jen: Also — do we need legal review on the new terms of service before launch?
Priya: Yes, almost certainly. Open question, I'll check with legal.
Priya: Okay, that wraps it. Thanks everyone.`;

const ENGINEERING_STANDUP = `Engineering Standup — October 16, 2025
Present: Sam, Lin, Devon, Aisha

Sam: Morning everyone. Quick round, then a couple of things to decide. Lin, you first.
Lin: Yesterday I finished the migration script for the user_preferences table. It's deployed to staging and ran in under a minute on a copy of prod data. Today I want to schedule the prod migration. Blocker: I need a maintenance window approved.
Sam: Approved. Let's do it Thursday October 23 at 6am. Lin, please post the maintenance notice in #status by Tuesday.
Lin: Will do.
Devon: I'm still debugging the flaky checkout test. It fails about one in fifteen runs in CI but I've never reproduced it locally. I think it's a race condition in the Stripe mock setup. I'd like another set of eyes — Aisha, can you pair with me on it tomorrow?
Aisha: Sure, after lunch works.
Sam: Good. Devon, if it's still not fixed by end of next week, October 24, we should just quarantine the test and file a ticket. Don't let it block deploys.
Devon: Agreed.
Aisha: I shipped the rate-limiter changes yesterday. Metrics look healthy. No action items from me — though I have a question. We're seeing about 0.3% of requests hit the limiter unexpectedly. Could be legitimate, could be a bug in the key derivation. I'm not sure if we should dig in or ignore.
Sam: That's worth investigating. Not super urgent but file a ticket. Aisha, can you take that on, medium priority, no firm deadline?
Aisha: Yeah I'll create the ticket today.
Sam: Decision time. We have two paths for the new search feature — Elasticsearch or Postgres full-text. We've been going back and forth for a week. Devon, you spiked both. What's your call?
Devon: For our scale Postgres full-text is sufficient. It's already in the stack, no new infra to operate, and the latency is acceptable. I'd recommend we go with Postgres.
Sam: Okay let's commit. We'll use Postgres full-text for search v1. We can reassess if data volume changes.
Lin: One more thing — the on-call rotation for November isn't filled. Who's owning that?
Sam: That's me, I'll have it published by Friday October 17.
Sam: Great. That's it. Thanks all.`;

export const SAMPLE_TRANSCRIPTS: SampleTranscript[] = [
  {
    id: "product-sync",
    label: "Product sync (decisions + open questions)",
    title: "Product Sync — Beta launch",
    date: "2025-10-14",
    participants: "Priya, Marcus, Jen, Tomas",
    text: PRODUCT_SYNC,
  },
  {
    id: "engineering-standup",
    label: "Engineering standup (action items + dates)",
    title: "Engineering Standup",
    date: "2025-10-16",
    participants: "Sam, Lin, Devon, Aisha",
    text: ENGINEERING_STANDUP,
  },
];
