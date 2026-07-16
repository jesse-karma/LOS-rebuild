import { MermaidDiagram } from "@/components/ui/MermaidDiagram";
import { SectionCard } from "@/components/ui/SectionCard";

const SCHEMA_CHART = `flowchart TD

  %% ── 1. Brand level: what a Brand owns directly ──────────────────
  subgraph BRANDLVL["① Brand level"]
    BRAND(["<b>Brand / KP</b>"])
    PT1["PT"]
    PT2["PT …"]
    PERSON1["Person<br/><small>Contact / Key Person</small>"]
    PERSON2["Person …"]
    P1["Project"]
    P2["Project"]
    P3["Project …"]
    BRAND -->|"1 : many"| PT1
    BRAND -.-> PT2
    BRAND -->|"1 : many"| PERSON1
    BRAND -.-> PERSON2
    BRAND -->|"1 : many"| P1
    BRAND -->|"1 : many"| P2
    BRAND -.-> P3
  end

  %% ── 2. Every Project is classified by Asset Class ───────────────
  subgraph ASSETGATE["② Asset Class — decides whether a Plafond even applies"]
    P1 --> ASSETA{{"Asset A<br/><small>one-off</small>"}}
    P2 --> ASSETB{{"Asset B<br/><small>B-I / B-PO — PO or Invoice</small>"}}
    P3 --> ASSETD{{"Asset D<br/><small>working capital</small>"}}
    ASSETA --> NOPLAFOND(("no Plafond<br/><small>ever, for Asset A</small>"))
    ASSETB --> NEEDS(("Plafond<br/>assessment<br/>required"))
    ASSETD --> NEEDS
  end

  %% ── 3. Plafond — one per Brand, consolidated across all its Projects
  subgraph PLAFONDLVL["③ Plafond — one per Brand, consolidating exposure across ALL its projects"]
    BRAND ==>|"1 : 1"| PLAFOND(["<b>Plafond</b><br/><small>Brand's credit ceiling</small>"])
    NEEDS -.-> PLAFOND
    PLAFOND --> TOTAL["Total Limit<br/><small>🔒 hard cap — cannot be breached</small>"]
    PLAFOND --> POSUB["PO Sub-Limit<br/><small>Asset B exposure</small>"]
    PLAFOND --> WCSUB["Working Capital Sub-Limit<br/><small>Asset D exposure</small>"]
    ASSETB -.->|"draws down"| POSUB
    ASSETD -.->|"draws down"| WCSUB
  end

  %% ── 4. Payor exposure — only enters the picture for Asset B ─────
  subgraph PAYORLVL["④ Payor exposure — only for Asset B projects"]
    ASSETB --> UNDERLYING["Underlying<br/>PO / Invoice"]
    UNDERLYING --> PAYOR(["Payor"])
    BRAND -.->|"exposure to"| JUNCTION["Junction<br/>Brand ↔ Payor"]
    PAYOR -.-> JUNCTION
    JUNCTION --> PAYORLIMIT["Payor-level limit<br/><small>⚠️ warning only — does NOT hard-block</small>"]
  end

  %% ── 5. Person / UBO — the same real person can sit under >1 Brand
  subgraph PERSONLVL["⑤ Person / UBO exposure — one person, possibly several Brands"]
    PERSON1 -.->|"Contact / Key Person / UBO"| PLINK["Person ↔ Brand link<br/><small>role + ownership %</small>"]
    OTHERBRAND(["Other Brand"]) -.->|"same person also linked here"| PLINK
    PLINK -.-> COMBINED(("combined exposure<br/>across all linked Brands"))
  end

  classDef hard stroke:#e5484d,stroke-width:3px;
  classDef warn stroke:#f5a524,stroke-width:2px;
  class TOTAL hard;
  class PAYORLIMIT warn;
  class COMBINED warn;
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

export default function CoreObjectPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">LOS Rebuild — Schema Diagram</h1>
      <p className="text-sm text-gray-500 mb-5">
        Brand, Projects, Assets, and Limits — how they actually relate.
      </p>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 mb-6">
        <MermaidDiagram chart={SCHEMA_CHART} />
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm border-2 border-red-500" />
            hard cap — cannot be breached
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm border-2 border-amber-500" />
            warning only — flags, doesn&apos;t block
          </span>
        </div>
      </div>

      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
        What each numbered block says
      </h2>
      <div className="space-y-3">
        <Block number="①" title="Brand level">
          <p>
            A Brand (KP) is the root. It can have <strong>multiple Projects</strong>,{" "}
            <strong>multiple PTs</strong> (legal entities), and <strong>multiple Persons</strong>{" "}
            (contacts / key persons) — all three are plain 1:many, no ceiling on any of them.
          </p>
        </Block>

        <Block number="②" title="Asset Class is the gate">
          <p>
            Every Project is classified into exactly one Asset Class, and that classification is
            what decides whether a Plafond even needs to be assessed:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Asset A</strong> — one-off financing. No Plafond concept applies to it, ever.
            </li>
            <li>
              <strong>Asset B</strong> (B-I / B-PO — invoice or PO financing) and{" "}
              <strong>Asset D</strong>{" "}
              (working capital) — both are &ldquo;revolving&rdquo; classes. A Project in either of
              these triggers a Plafond assessment.
            </li>
          </ul>
          <p>
            This is also where each Asset Class routes to a different submission/DD form — the
            fields the analyst fills differ by class, but that&apos;s a form-routing concern, not
            a data relationship, so it isn&apos;t drawn here.
          </p>
        </Block>

        <Block number="③" title="Plafond is consolidated at the Brand, not the Project">
          <p>
            There is <strong>one Plafond per Brand</strong>{" "}
            — not one per Project, not one per Asset Class. If a Brand has three Projects that are
            all Asset B or D, all three draw against the <em>same</em> shared ceiling. That ceiling
            has:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              A <strong>Total Limit</strong> — a hard cap for the whole Brand.{" "}
              <strong>This cannot be breached.</strong>
            </li>
            <li>
              A <strong>PO Sub-Limit</strong>{" "}
              — the portion available for Asset B (invoice/PO) exposure.
            </li>
            <li>
              A <strong>Working Capital Sub-Limit</strong>{" "}
              — the portion available for Asset D exposure.
            </li>
          </ul>
          <p>
            Because it&apos;s consolidated, &ldquo;Remaining&rdquo; is always a computed value —
            Limit minus the sum of what every one of the Brand&apos;s relevant Projects has drawn
            — not a number stored and edited by hand.
          </p>
        </Block>

        <Block number="④" title="Payor exposure only shows up for Asset B">
          <p>
            An Asset B Project has an Underlying PO/Invoice, which points to a{" "}
            <strong>Payor</strong>. The Brand&apos;s exposure to that specific Payor is tracked on
            the <strong>Junction (Brand ↔ Payor)</strong>, and that pairing carries its own limit.
            Critically, this Payor-level limit is a <strong>warning, not a hard block</strong>
            {" "}— it&apos;s allowed to be exceeded, it just raises a flag for the analyst/IC to
            resolve.
            That&apos;s the opposite behavior from the Brand&apos;s Total Limit, which is a hard,
            non-negotiable ceiling — the diagram marks the two differently (🔒 red = hard cap, ⚠️
            amber = warning-only) so they&apos;re never confused.
          </p>
        </Block>

        <Block number="⑤" title="Person / UBO exposure follows the exact same shape as Payor exposure">
          <p>
            A Person isn&apos;t strictly owned by one Brand — the same real individual (typically
            a UBO — Ultimate Beneficial Owner) can be a Contact, Key Person, or owner-of-record
            for <em>more than one</em>{" "}
            Brand at once. So Person is modeled as global, exactly like Payor, and a{" "}
            <strong>Person ↔ Brand link</strong>{" "}
            (carrying the role, and an ownership % when that role is UBO) is what connects a given
            person to every Brand they&apos;re actually behind.
          </p>
          <p>
            The reason this matters: if the same UBO sits behind two Brands, their real combined
            exposure is the sum across both — evaluating either Brand&apos;s Plafond in isolation
            would understate the risk. That combined figure is marked ⚠️ amber for the same reason
            the Payor limit is: it&apos;s a signal to weigh, not a hard database constraint.
          </p>
        </Block>
      </div>
    </div>
  );
}
