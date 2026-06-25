import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, Plus, Trash2, Pencil } from "lucide-react";
import { useGetWordStats, getGetWordStatsQueryKey } from "@workspace/api-client-react";
import { REGIONS, SURROUNDINGS, DAY_NIGHT, AGES, FINDABILITY, SEASONS } from "@/lib/constants";
import { EmptyState } from "./EmptyState";

const STORAGE_KEY = "bingo-definitions-v2";

interface Definition {
  id: string;
  tag: string;
  definition: string;
  type: "Single select" | "Multiselect";
}

function defId(): string {
  return crypto.randomUUID();
}

interface ColumnGroup {
  column: string;
  emoji: string;
  description: string;
  definitions: Definition[];
}

const DEFAULT_GROUPS: ColumnGroup[] = [
  {
    column: "Region",
    emoji: "🗺️",
    description: "Which US region(s) this item can be found in. Use All if it's universally applicable across the country.",
    definitions: [
      { id: "reg-all",    tag: "All",     definition: "Can be found in any state or region of the country (US).", type: "Multiselect" },
      { id: "reg-ne",     tag: "NE",      definition: "NE or Northeast, includes Maine, New Hampshire, Vermont, Massachusetts, Rhode Island, Connecticut, New York, New Jersey, Delaware, Pennsylvania, and Maryland.", type: "Multiselect" },
      { id: "reg-se",     tag: "SE",      definition: "SE or Southeast includes Washington DC, Virginia, North Carolina, South Carolina, West Virginia, Georgia, Florida, Alabama, Kentucky, Tennessee.", type: "Multiselect" },
      { id: "reg-ncent",  tag: "N Cent",  definition: "N Cent or the Midwest states include Ohio, Indiana, Illinois, Michigan, Wisconsin, Minnesota, North Dakota, South Dakota, Nebraska, Iowa.", type: "Multiselect" },
      { id: "reg-scent",  tag: "S Cent",  definition: "S Cent or South Central states include Arkansas, Louisiana, Texas, Oklahoma, Kansas.", type: "Multiselect" },
      { id: "reg-nwak",   tag: "NW + AK", definition: "NW or Northwest includes northern California, Oregon, Washington, Idaho, Montana, Wyoming, Utah, Colorado, and Alaska.", type: "Multiselect" },
      { id: "reg-swhi",   tag: "SW + HI", definition: "SW or Southwest includes New Mexico, Arizona, Nevada, Hawaii and southern California.", type: "Multiselect" },
    ],
  },
  {
    column: "Surroundings",
    emoji: "🏙️",
    description: "The population density or geographic type where this item is likely to be spotted.",
    definitions: [
      { id: "sur-all",      tag: "All",               definition: "Generally applicable to any population density or geographic type.", type: "Multiselect" },
      { id: "sur-urban",    tag: "Urban / City",       definition: "A dense and populous region.", type: "Multiselect" },
      { id: "sur-rural",    tag: "Rural / Xurban",     definition: "Low population where the animals likely outnumber the humans.", type: "Multiselect" },
      { id: "sur-suburban", tag: "Suburban / Town",    definition: "A mix of housing and shopping with medium population density.", type: "Multiselect" },
      { id: "sur-highway",  tag: "Highway",            definition: "Interstate or driving with limited access.", type: "Multiselect" },
      { id: "sur-coast",    tag: "Coast",              definition: "Oceanic coastlines anywhere in the country.", type: "Multiselect" },
    ],
  },
  {
    column: "Day / Night",
    emoji: "🌓",
    description: "When this item is most visible or relevant during a road trip.",
    definitions: [
      { id: "dn-day",   tag: "Day",   definition: "Can be easily seen during the day.", type: "Multiselect" },
      { id: "dn-night", tag: "Night", definition: "Can be easily seen at night.", type: "Multiselect" },
    ],
  },
  {
    column: "Age",
    emoji: "👧",
    description: "The youngest age group that would understand and recognize this item. Lower values are inclusive of higher groups.",
    definitions: [
      { id: "age-young", tag: "Young", definition: "A word that is understandable by 3+ years of age and easily conveyed through a drawing. If this is selected, then young, kids, and tweens can all appreciate these words.", type: "Single select" },
      { id: "age-kid",   tag: "Kid",   definition: "Common words most kids would know. If this is selected then both kids and tweens can appreciate these words.", type: "Single select" },
      { id: "age-tween", tag: "Tween", definition: "More difficult terms that only kids who are reading chapter books without pictures would likely know.", type: "Single select" },
    ],
  },
  {
    column: "Findability",
    emoji: "🔍",
    description: "How often this item is likely to be spotted on a typical driving trip. Boards should lean heavily toward High and Medium.",
    definitions: [
      { id: "fi-high",   tag: "High",   definition: "Easily spotted within 20 minutes on a typical driving trip.", type: "Single select" },
      { id: "fi-medium", tag: "Medium", definition: "Generally known and easily pictured but not quite as prevalent. Usually spotted within an hour on a typical driving trip.", type: "Single select" },
      { id: "fi-low",    tag: "Low",    definition: "Rarely spotted and may not be seen without visiting select destinations where relevant. Most bingo boards shouldn't have more than 3–5 tiles considered low findability.", type: "Single select" },
    ],
  },
  {
    column: "Season",
    emoji: "🍂",
    description: "Which months of the year this item is commonly visible. Use All if it can be found year-round.",
    definitions: [
      { id: "sea-all",    tag: "All",    definition: "These items can be found any month of the year. If selected, the other seasons are not selected.", type: "Multiselect" },
      { id: "sea-spring", tag: "Spring", definition: "These items can be found in March, April, or May.", type: "Multiselect" },
      { id: "sea-summer", tag: "Summer", definition: "These items can be found in June, July, or August.", type: "Multiselect" },
      { id: "sea-fall",   tag: "Fall",   definition: "These items can be found in September, October, or November.", type: "Multiselect" },
      { id: "sea-winter", tag: "Winter", definition: "These items can be found in December, January, or February.", type: "Multiselect" },
    ],
  },
];

const CORE_TAGS: Record<string, readonly string[]> = {
  "Region": REGIONS,
  "Surroundings": SURROUNDINGS,
  "Day / Night": DAY_NIGHT,
  "Age": AGES,
  "Findability": FINDABILITY,
  "Season": SEASONS,
};

function backfillIds(groups: ColumnGroup[]): ColumnGroup[] {
  return groups.map((g) => ({
    ...g,
    definitions: g.definitions.map((d) =>
      d.id ? d : { ...d, id: defId() }
    ),
  }));
}

function loadGroups(): ColumnGroup[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return backfillIds(JSON.parse(raw) as ColumnGroup[]);
  } catch {}
  return DEFAULT_GROUPS;
}

function saveGroups(groups: ColumnGroup[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(groups)); } catch {}
}

interface EditState {
  groupIdx: number;
  defIdx: number;
  field: "tag" | "definition";
  value: string;
}

interface AddState {
  groupIdx: number;
  tag: string;
  definition: string;
}

interface PendingDelete {
  groupIdx: number;
  defIdx: number;
}

export default function DefinitionsPanel() {
  const [groups, setGroups] = useState<ColumnGroup[]>(loadGroups);
  const [editing, setEditing] = useState<EditState | null>(null);
  const [adding, setAdding] = useState<AddState | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);

  useEffect(() => { saveGroups(groups); }, [groups]);

  const { data: stats } = useGetWordStats({
    query: { queryKey: getGetWordStatsQueryKey(), staleTime: 60_000 },
  });

  const usageLookup: Record<string, Record<string, number>> = {
    "Region":     stats?.byRegion     ?? {},
    "Surroundings": stats?.bySurroundings ?? {},
    "Day / Night":  stats?.byDayNight   ?? {},
    "Age":          stats?.byAge         ?? {},
    "Findability":  stats?.byFindability ?? {},
    "Season":       stats?.bySeason      ?? {},
  };

  function getUsage(column: string, tag: string): number {
    return usageLookup[column]?.[tag] ?? 0;
  }

  function isCore(column: string, tag: string): boolean {
    return (CORE_TAGS[column] as string[] | undefined)?.includes(tag) ?? false;
  }

  function startEdit(groupIdx: number, defIdx: number, field: "tag" | "definition") {
    setAdding(null);
    setPendingDelete(null);
    setEditing({ groupIdx, defIdx, field, value: groups[groupIdx].definitions[defIdx][field] });
  }

  function commitEdit() {
    if (!editing) return;
    const { groupIdx, defIdx, field, value } = editing;
    setGroups((prev) =>
      prev.map((g, gi) =>
        gi !== groupIdx ? g : {
          ...g,
          definitions: g.definitions.map((d, di) =>
            di !== defIdx ? d : { ...d, [field]: value }
          ),
        }
      )
    );
    setEditing(null);
  }

  function cancelEdit() { setEditing(null); }

  function requestDelete(groupIdx: number, defIdx: number) {
    setEditing(null);
    setAdding(null);
    setPendingDelete({ groupIdx, defIdx });
  }

  function confirmDelete() {
    if (!pendingDelete) return;
    const { groupIdx, defIdx } = pendingDelete;
    setGroups((prev) =>
      prev.map((g, gi) =>
        gi !== groupIdx ? g : { ...g, definitions: g.definitions.filter((_, di) => di !== defIdx) }
      )
    );
    setPendingDelete(null);
  }

  function cancelDelete() { setPendingDelete(null); }

  function commitAdd() {
    if (!adding || !adding.tag.trim() || !adding.definition.trim()) return;
    const { groupIdx, tag, definition } = adding;
    setGroups((prev) =>
      prev.map((g, gi) =>
        gi !== groupIdx ? g : {
          ...g,
          definitions: [...g.definitions, { id: defId(), tag: tag.trim(), definition: definition.trim(), type: g.definitions[0]?.type ?? "Multiselect" }],
        }
      )
    );
    setAdding(null);
  }

  const [confirmReset, setConfirmReset] = useState(false);

  function resetToDefaults() {
    setGroups(DEFAULT_GROUPS);
    setConfirmReset(false);
  }

  function restoreGroupDefaults(gi: number) {
    const col = groups[gi]?.column;
    const defaults = DEFAULT_GROUPS.find((g) => g.column === col);
    if (!defaults) return;
    setGroups((prev) =>
      prev.map((g, i) => (i === gi ? { ...g, definitions: defaults.definitions } : g))
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-16">

      {/* ── Page header ── */}
      <div className="border-b border-border py-8">
        <p className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-muted-foreground mb-2">
          Reference · Used by AI Autofill
        </p>
        <h2 className="text-3xl md:text-4xl font-editorial italic text-foreground leading-tight">
          Tag Definitions
        </h2>
      </div>

      {/* ── All-groups-gone empty state ── */}
      {groups.length === 0 && (
        <EmptyState
          headline="No definitions"
          body="All definition groups have been removed. Restore the defaults to bring them back."
        >
          {confirmReset ? (
            <div className="flex items-center gap-3">
              <button
                onClick={resetToDefaults}
                className="flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.14em] uppercase border border-destructive/60 text-destructive px-4 py-2 hover:bg-destructive/10 transition-colors"
              >
                Confirm restore
              </button>
              <button
                onClick={() => setConfirmReset(false)}
                className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmReset(true)}
              className="flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.14em] uppercase border border-border px-4 py-2 hover:bg-muted/40 transition-colors"
            >
              Restore default definitions
            </button>
          )}
        </EmptyState>
      )}

      {/* ── Column groups ── */}
      {groups.map((group, gi) => (
        <section key={group.column} className="border-b border-border">

          {/* Group eyebrow header */}
          <div className="pt-8 pb-5">
            <div className="flex items-baseline gap-3 mb-1.5">
              <p className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-muted-foreground">
                {group.emoji} {group.column}
              </p>
              <span className="font-mono text-[9.5px] tracking-[0.12em] uppercase text-muted-foreground/50">
                · {group.definitions[0]?.type ?? "Multiselect"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground max-w-[65ch] leading-relaxed">
              {group.description}
            </p>
          </div>

          {/* Tag definitions list */}
          <div className="pb-2">
            {/* Per-group empty state */}
            {group.definitions.length === 0 && adding?.groupIdx !== gi && (
              <div className="py-10 border-t border-border/50 flex flex-col items-center gap-3 text-center">
                <p className="text-sm text-muted-foreground">No definitions in this group yet.</p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={() => { setEditing(null); setPendingDelete(null); setAdding({ groupIdx: gi, tag: "", definition: "" }); }}
                    className="flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.14em] uppercase border border-border px-3 py-1.5 hover:bg-muted/40 transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    Add definition
                  </button>
                  {DEFAULT_GROUPS.some(g => g.column === group.column) && (
                    <button
                      onClick={() => restoreGroupDefaults(gi)}
                      className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-muted-foreground hover:text-foreground border border-border/60 px-3 py-1.5 hover:bg-muted/40 transition-colors"
                    >
                      Restore defaults for this group
                    </button>
                  )}
                </div>
              </div>
            )}

            {group.definitions.map((def, di) => {
              const isEditingTag = editing?.groupIdx === gi && editing.defIdx === di && editing.field === "tag";
              const isEditingDef = editing?.groupIdx === gi && editing.defIdx === di && editing.field === "definition";
              const isPendingDel = pendingDelete?.groupIdx === gi && pendingDelete.defIdx === di;
              const usage = stats ? getUsage(group.column, def.tag) : null;
              const core = isCore(group.column, def.tag);

              return (
                <div
                  key={def.id}
                  className={`group/row flex items-start gap-5 py-5 border-t border-border/50 transition-colors -mx-4 px-4 ${isPendingDel ? "bg-destructive/5" : "hover:bg-muted/20"}`}
                >
                  {/* Tag name */}
                  <div className="w-36 md:w-44 shrink-0">
                    {isEditingTag ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          autoFocus
                          type="text"
                          className="bg-transparent border-0 border-b border-foreground font-editorial italic text-2xl text-foreground outline-none py-0 w-32"
                          value={editing.value}
                          onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                          onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") cancelEdit(); }}
                        />
                        <button onClick={commitEdit} className="p-0.5 text-foreground hover:text-foreground/70 transition-colors">
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={cancelEdit} className="p-0.5 text-muted-foreground hover:text-foreground transition-colors">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => !isPendingDel && startEdit(gi, di, "tag")}
                          title={isPendingDel ? undefined : "Click to edit tag name"}
                          className="group/tag flex items-center gap-2 text-left"
                        >
                          <span className="text-2xl font-editorial italic text-foreground leading-tight">
                            {def.tag}
                          </span>
                          {!isPendingDel && (
                            <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover/tag:opacity-50 transition-opacity shrink-0" />
                          )}
                        </button>
                        <div className="flex items-center gap-2">
                          {core && (
                            <span className="font-mono text-[9.5px] tracking-[0.1em] uppercase text-muted-foreground/40">
                              core
                            </span>
                          )}
                          {usage !== null && (
                            <span className="font-mono text-[9.5px] tracking-[0.1em] text-muted-foreground/50">
                              {usage === 0 ? "0 words" : `${usage} word${usage === 1 ? "" : "s"}`}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Definition text / pending delete confirmation */}
                  <div className="flex-1 min-w-0 pt-1">
                    {isPendingDel ? (
                      <div className="space-y-3">
                        {usage !== null && usage > 0 ? (
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            <span className="text-foreground font-medium">{usage} word{usage === 1 ? "" : "s"}</span> {usage === 1 ? "has" : "have"} this tag.
                            {core
                              ? " Deleting removes the explanation only — the tag value stays available in all dropdowns because it's a core option."
                              : " Deleting removes the explanation only — the tag value stays on those words."}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            No words currently use this tag.
                            {core && " The tag value will still appear in dropdowns because it's a core option."}
                            {" "}Delete this definition?
                          </p>
                        )}
                        <div className="flex items-center gap-3">
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 text-xs px-3 rounded-none"
                            onClick={confirmDelete}
                          >
                            Delete definition
                          </Button>
                          <button
                            onClick={cancelDelete}
                            className="font-mono text-[10.5px] tracking-[0.16em] uppercase text-muted-foreground hover:text-foreground transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : isEditingDef ? (
                      <div className="flex flex-col gap-2">
                        <Textarea
                          autoFocus
                          className="text-sm min-h-[80px] resize-y bg-transparent border-border/50 rounded-none focus-visible:border-foreground focus-visible:ring-0"
                          value={editing.value}
                          onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                          onKeyDown={(e) => { if (e.key === "Escape") cancelEdit(); }}
                        />
                        <div className="flex gap-3">
                          <Button size="sm" className="h-7 text-xs px-3 rounded-none" onClick={commitEdit}>Save</Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs px-2 rounded-none" onClick={cancelEdit}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <button
                        className="group/def flex items-start gap-1.5 text-left w-full"
                        onClick={() => startEdit(gi, di, "definition")}
                        title="Click to edit definition"
                      >
                        <span className="text-sm text-muted-foreground leading-relaxed hover:text-foreground transition-colors">
                          {def.definition}
                        </span>
                        <Pencil className="h-3 w-3 shrink-0 mt-0.5 text-muted-foreground opacity-0 group-hover/def:opacity-50 transition-opacity" />
                      </button>
                    )}
                  </div>

                  {/* Delete trigger */}
                  <div className={`shrink-0 pt-1 transition-opacity ${isPendingDel ? "opacity-0 pointer-events-none" : "opacity-0 group-hover/row:opacity-100"}`}>
                    <button
                      onClick={() => requestDelete(gi, di)}
                      className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                      title="Delete this definition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Add row */}
            {adding?.groupIdx === gi ? (
              <div className="flex items-start gap-5 py-5 border-t border-border/50 -mx-4 px-4 bg-muted/20">
                <span className="text-xl font-editorial italic select-none tabular-nums leading-none text-muted-foreground/30 shrink-0 pt-1 w-6 text-right">
                  {String(group.definitions.length + 1).padStart(2, "0")}
                </span>
                <div className="w-36 md:w-44 shrink-0">
                  <input
                    autoFocus
                    type="text"
                    placeholder="Tag name"
                    className="bg-transparent border-0 border-b border-foreground font-editorial italic text-2xl text-foreground placeholder:text-muted-foreground/30 outline-none py-0 w-full"
                    value={adding.tag}
                    onChange={(e) => setAdding({ ...adding, tag: e.target.value })}
                  />
                </div>
                <div className="flex-1 flex flex-col gap-2 pt-1">
                  <Textarea
                    placeholder="Definition text…"
                    className="text-sm min-h-[70px] resize-y bg-transparent border-border/50 rounded-none focus-visible:border-foreground focus-visible:ring-0 placeholder:text-muted-foreground/50"
                    value={adding.definition}
                    onChange={(e) => setAdding({ ...adding, definition: e.target.value })}
                  />
                  <div className="flex gap-3">
                    <Button
                      size="sm"
                      className="h-7 text-xs px-3 rounded-none"
                      onClick={commitAdd}
                      disabled={!adding.tag.trim() || !adding.definition.trim()}
                    >
                      Add
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs px-2 rounded-none" onClick={() => setAdding(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
                <div className="w-7 shrink-0" />
              </div>
            ) : (
              <div className="py-4 border-t border-border/50 -mx-4 px-4">
                <button
                  onClick={() => { setEditing(null); setPendingDelete(null); setAdding({ groupIdx: gi, tag: "", definition: "" }); }}
                  className="flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.18em] uppercase text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add definition
                </button>
              </div>
            )}
          </div>
        </section>
      ))}

      {/* ── Bottom info + reset box ── */}
      <div className="mt-10 border border-border p-5 space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          These definitions describe each tag value and guide how words are categorized.
          They are referenced by the AI when suggesting new words or filling in missing tags.
          Click any tag or definition to edit it inline.
        </p>
        <div className="flex items-center justify-between gap-4">
          <p className="font-mono text-[9.5px] tracking-[0.16em] uppercase text-muted-foreground/50">
            Changes saved automatically in your browser.
          </p>
          {confirmReset ? (
            <div className="flex items-center gap-3">
              <span className="font-mono text-[9.5px] tracking-[0.16em] uppercase text-muted-foreground/50">Sure?</span>
              <button
                onClick={resetToDefaults}
                className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-foreground hover:text-foreground/70 transition-colors underline underline-offset-4 decoration-border shrink-0"
              >
                Confirm
              </button>
              <button
                onClick={() => setConfirmReset(false)}
                className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmReset(true)}
              className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4 decoration-border shrink-0"
            >
              Reset Defaults
            </button>
          )}
        </div>
      </div>

    </div>
  );
}
