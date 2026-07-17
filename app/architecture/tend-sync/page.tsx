import { MermaidDiagram } from "@/components/ui/MermaidDiagram";
import { SectionCard } from "@/components/ui/SectionCard";

const SYNC_CHART = `flowchart LR

  %% ── 1. tend keeps the kanban — the analyst's day-to-day view ─────
  subgraph TENDSIDE["① tend — Board (kanban) stays exactly as it is today"]
    direction TB
    L0(["0 New lead"])
    L1(["1 Met"])
    L2(["2 Funding Lead"])
    L3(["3 Due Diligence"])
    L4(["4 IC Review<br/><small>terminal in tend</small>"])
    L0 -->|"Marketing nurtures"| L1
    L1 -->|"drag card"| L2
    L2 -->|"drag card"| L3
    L3 -->|"drag card"| L4
    CARD["Card<br/><small>notes · tasks · staleness</small>"]
    L2 -.-> CARD
    L3 -.-> CARD
    L4 -.-> CARD
  end

  %% ── 2. Reuse the exact machinery already built for tend ⇄ Coda ───
  subgraph SYNC["② Sync engine — same design as tend ⇄ Coda today, re-pointed at the LOS · PROPOSED"]
    direction TB
    KEY(("Stable ID<br/><small>losProjectId<br/>(today: codaRowId)</small>"))
    STATUSMAP["Status match<br/><small>tend column label ⇄ LOS lead status</small>"]
    FIELDMAP["Mapped fields<br/><small>bi-directional · last-edit-wins</small>"]
    NOTESMAP["Notes<br/><small>append / union · never overwrite</small>"]
    SCHED(("Batched<br/><small>cron 2×/day + on-load + manual</small>"))
    KEY --> STATUSMAP
    KEY --> FIELDMAP
    KEY --> NOTESMAP
    SCHED -.-> KEY
  end

  %% ── 3. LOS owns the heavy structured data, and keeps going ────────
  subgraph LOSSIDE["③ LOS-rebuild — owns structured origination data, continues past tend's scope"]
    direction TB
    SUB2["Submission<br/><small>Due Diligence pool</small>"]
    SUB3["Submission<br/><small>IC Review</small>"]
    BEYOND["Finance → Legal → Disburse<br/><small>tend has no visibility here</small>"]
    SUB2 --> SUB3 --> BEYOND
  end

  CARD ==> KEY
  STATUSMAP <-.-> SUB2
  STATUSMAP <-.-> SUB3
  FIELDMAP <-.-> SUB2
  NOTESMAP <-.-> SUB2

  classDef proposed stroke:#f5a524,stroke-width:2px,stroke-dasharray: 4 3;
  class SYNC,KEY,STATUSMAP,FIELDMAP,NOTESMAP,SCHED proposed;
  classDef losonly stroke:#2365E7,stroke-width:2px;
  class BEYOND losonly;
`;

function Block({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <SectionCard title={`${number} ${title}`}>
      <div className="text-sm text-gray-700 leading-relaxed space-y-2 mt-1">{children}</div>
    </SectionCard>
  );
}

export default function TendSyncPage() {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <h1 className="text-2xl font-bold text-gray-900">Tend ⇄ LOS Sync</h1>
        <span className="text-xs bg-amber-100 text-amber-700 font-medium px-1.5 py-0.5 rounded">
          Proposal — not yet built
        </span>
      </div>
      <p className="text-sm text-gray-500 mb-5">
        How analysts keep tend&apos;s card-dragging board instead of bouncing between two systems.
      </p>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 mb-6">
        <MermaidDiagram chart={SYNC_CHART} />
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm border-2 border-amber-500 border-dashed" />
            proposed — doesn&apos;t exist yet
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm border-2 border-blue-600" />
            LOS-only — beyond tend&apos;s scope
          </span>
        </div>
      </div>

      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
        What each numbered block says
      </h2>
      <div className="space-y-3">
        <Block number="①" title="tend keeps its board — nothing changes for the analyst">
          <p>
            The whole point is that analysts <strong>keep dragging cards</strong>{" "}
            through tend&apos;s kanban exactly as they do today — 0 New lead → 1 Met → 2 Funding
            Lead → 3 Due Diligence → 4 IC Review. Status 4 is still terminal in tend; it&apos;s the
            signal that a deal has left the CRM&apos;s job and entered origination. Nothing about
            the Marketing-owned 0→1 stage needs to change at all.
          </p>
        </Block>

        <Block number="②" title="Reuse the sync engine tend already built for Coda">
          <p>
            tend&apos;s own docs already anticipate this exact move: the sync layer is{" "}
            <em>record-store-agnostic</em>, built so that once origination moves off Coda, tend
            re-points the same machinery at the new system —{" "}
            <strong>no re-architecture required</strong>. So instead of building a second kanban
            inside the LOS, the plan is to give the LOS the same surface Coda already offers:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              A <strong>stable ID</strong> on each submission that tend can key against — the same
              role <code>codaRowId</code> plays today, just pointed at a LOS project id instead.
            </li>
            <li>
              <strong>Status matching by label</strong>, not by number — tend&apos;s column names
              (&ldquo;2 Funding Lead&rdquo;, &ldquo;3 Due Diligence&rdquo;) already match this
              app&apos;s own lead-status codes, so this is largely already aligned.
            </li>
            <li>
              A handful of <strong>mapped fields</strong>, bi-directional, last-edit-wins — Brand/KP
              name, Owner/Primary Analyst, Asset Class, Requested Amount — the same 5–6 field
              pattern tend uses for Coda.
            </li>
            <li>
              <strong>Notes flowing back</strong>{" "}
              as append/union, never overwrite — a note written in tend shows up in the
              LOS&apos;s notes feed and vice versa, exactly like a tend note becomes a linked row
              in Coda today.
            </li>
            <li>
              The same <strong>batched schedule</strong>{" "}
              (cron twice a day, a soft on-load trigger, a manual &ldquo;Sync Now&rdquo;) rather
              than real-time — consistent with how Coda&apos;s rate limits are handled today.
            </li>
          </ul>
        </Block>

        <Block number="③" title="LOS owns the heavy data, and keeps going past tend">
          <p>
            The LOS only needs to be the system of record for what tend was never meant to hold —
            asset class, financing terms, plafond, KP contacts, financial reviews. Sync only needs
            to cover the fields analysts actually check from the board (status, owner, latest
            note), not the full DD form. And critically, the LOS keeps moving a deal through Finance
            → Legal → Disbursement long after tend&apos;s board considers the card &ldquo;done&rdquo;
            at status 4 — tend has no visibility past that point today, and doesn&apos;t need it.
          </p>
        </Block>

        <Block number="→" title="Why this beats building a second board">
          <p>
            We already tried building a Trello-style board directly in the LOS for the Due
            Diligence stage — and reverted it. It would have meant analysts learn two kanban UIs,
            and the LOS would own a card-dragging interaction it isn&apos;t well-shaped for (it&apos;s
            form/table-centric by design). Re-pointing tend&apos;s existing sync engine instead means
            one board, one drag-and-drop home, and the LOS focuses purely on the structured
            origination data it&apos;s actually good at.
          </p>
        </Block>
      </div>
    </div>
  );
}
