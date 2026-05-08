import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, Plus, Trash2, Pencil } from "lucide-react";

const STORAGE_KEY = "bingo-definitions-v2";

interface Definition {
  tag: string;
  definition: string;
  type: "Single select" | "Multiselect";
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
      { tag: "All", definition: "Can be found in any state or region of the country (US).", type: "Multiselect" },
      { tag: "NE", definition: "NE or Northeast, includes Maine, New Hampshire, Vermont, Massachusetts, Rhode Island, Connecticut, New York, New Jersey, Delaware, Pennsylvania, and Maryland.", type: "Multiselect" },
      { tag: "SE", definition: "SE or Southeast includes Washington DC, Virginia, North Carolina, South Carolina, West Virginia, Georgia, Florida, Alabama, Kentucky, Tennessee.", type: "Multiselect" },
      { tag: "N Cent", definition: "N Cent or the Midwest states include Ohio, Indiana, Illinois, Michigan, Wisconsin, Minnesota, North Dakota, South Dakota, Nebraska, Iowa.", type: "Multiselect" },
      { tag: "S Cent", definition: "S Cent or South Central states include Arkansas, Louisiana, Texas, Oklahoma, Kansas.", type: "Multiselect" },
      { tag: "NW + AK", definition: "NW or Northwest includes northern California, Oregon, Washington, Idaho, Montana, Wyoming, Utah, Colorado, and Alaska.", type: "Multiselect" },
      { tag: "SW + HI", definition: "SW or Southwest includes New Mexico, Arizona, Nevada, Hawaii and southern California.", type: "Multiselect" },
    ],
  },
  {
    column: "Surroundings",
    emoji: "🏙️",
    description: "The population density or geographic type where this item is likely to be spotted.",
    definitions: [
      { tag: "All", definition: "Generally applicable to any population density or geographic type.", type: "Multiselect" },
      { tag: "Urban / City", definition: "A dense and populous region.", type: "Multiselect" },
      { tag: "Rural / Xurban", definition: "Low population where the animals likely outnumber the humans.", type: "Multiselect" },
      { tag: "Suburban / Town", definition: "A mix of housing and shopping with medium population density.", type: "Multiselect" },
      { tag: "Highway", definition: "Interstate or driving with limited access.", type: "Multiselect" },
      { tag: "Coast", definition: "Oceanic coastlines anywhere in the country.", type: "Multiselect" },
    ],
  },
  {
    column: "Day / Night",
    emoji: "🌓",
    description: "When this item is most visible or relevant during a road trip.",
    definitions: [
      { tag: "Day", definition: "Can be easily seen during the day.", type: "Multiselect" },
      { tag: "Night", definition: "Can be easily seen at night.", type: "Multiselect" },
    ],
  },
  {
    column: "Age",
    emoji: "👧",
    description: "The youngest age group that would understand and recognize this item. Lower values are inclusive of higher groups.",
    definitions: [
      { tag: "Young", definition: "A word that is understandable by 3+ years of age and easily conveyed through a drawing. If this is selected, then young, kids, and tweens can all appreciate these words.", type: "Single select" },
      { tag: "Kid", definition: "Common words most kids would know. If this is selected then both kids and tweens can appreciate these words.", type: "Single select" },
      { tag: "Tween", definition: "More difficult terms that only kids who are reading chapter books without pictures would likely know.", type: "Single select" },
    ],
  },
  {
    column: "Findability",
    emoji: "🔍",
    description: "How often this item is likely to be spotted on a typical driving trip. Boards should lean heavily toward High and Medium.",
    definitions: [
      { tag: "High", definition: "Easily spotted within 20 minutes on a typical driving trip.", type: "Single select" },
      { tag: "Medium", definition: "Generally known and easily pictured but not quite as prevalent. Usually spotted within an hour on a typical driving trip.", type: "Single select" },
      { tag: "Low", definition: "Rarely spotted and may not be seen without visiting select destinations where relevant. Most bingo boards shouldn't have more than 3–5 tiles considered low findability.", type: "Single select" },
    ],
  },
  {
    column: "Season",
    emoji: "🍂",
    description: "Which months of the year this item is commonly visible. Use All if it can be found year-round.",
    definitions: [
      { tag: "All", definition: "These items can be found any month of the year. If selected, the other seasons are not selected.", type: "Multiselect" },
      { tag: "Spring", definition: "These items can be found in March, April, or May.", type: "Multiselect" },
      { tag: "Summer", definition: "These items can be found in June, July, or August.", type: "Multiselect" },
      { tag: "Fall", definition: "These items can be found in September, October, or November.", type: "Multiselect" },
      { tag: "Winter", definition: "These items can be found in December, January, or February.", type: "Multiselect" },
    ],
  },
];

function loadGroups(): ColumnGroup[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as ColumnGroup[];
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

export default function DefinitionsPanel() {
  const [groups, setGroups] = useState<ColumnGroup[]>(loadGroups);
  const [editing, setEditing] = useState<EditState | null>(null);
  const [adding, setAdding] = useState<AddState | null>(null);

  useEffect(() => { saveGroups(groups); }, [groups]);

  function startEdit(groupIdx: number, defIdx: number, field: "tag" | "definition") {
    setAdding(null);
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

  function deleteDef(groupIdx: number, defIdx: number) {
    setGroups((prev) =>
      prev.map((g, gi) =>
        gi !== groupIdx ? g : { ...g, definitions: g.definitions.filter((_, di) => di !== defIdx) }
      )
    );
  }

  function commitAdd() {
    if (!adding || !adding.tag.trim() || !adding.definition.trim()) return;
    const { groupIdx, tag, definition } = adding;
    setGroups((prev) =>
      prev.map((g, gi) =>
        gi !== groupIdx ? g : {
          ...g,
          definitions: [...g.definitions, { tag: tag.trim(), definition: definition.trim(), type: g.definitions[0]?.type ?? "Multiselect" }],
        }
      )
    );
    setAdding(null);
  }

  function resetToDefaults() {
    if (confirm("Reset all definitions to the original defaults? Any edits you've made will be lost.")) {
      setGroups(DEFAULT_GROUPS);
    }
  }

  return (
    <div className="max-w-5xl mx-auto pb-16">

      {/* ── Page header ── */}
      <div className="border-b border-border py-8">
        <p className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-muted-foreground mb-2">
          Reference · Used by AI Autofill
        </p>
        <h2 className="text-3xl md:text-4xl [font-family:'Instrument_Serif',Georgia,serif] italic text-foreground leading-tight">
          Tag Definitions
        </h2>
      </div>

      {/* ── Column groups ── */}
      {groups.map((group, gi) => (
        <section key={group.column} className="border-b border-border">

          {/* Group eyebrow header */}
          <div className="pt-8 pb-5">
            <div className="flex items-baseline gap-3 mb-1.5">
              <p className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-muted-foreground">
                {group.emoji} {group.column}
              </p>
              <span className="font-mono text-[9px] tracking-[0.12em] uppercase text-muted-foreground/50">
                · {group.definitions[0]?.type ?? "Multiselect"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground max-w-[65ch] leading-relaxed">
              {group.description}
            </p>
          </div>

          {/* Tag definitions list */}
          <div className="pb-2">
            {group.definitions.map((def, di) => {
              const isEditingTag = editing?.groupIdx === gi && editing.defIdx === di && editing.field === "tag";
              const isEditingDef = editing?.groupIdx === gi && editing.defIdx === di && editing.field === "definition";
              const plateNum = String(di + 1).padStart(2, "0");

              return (
                <div
                  key={di}
                  className="group/row flex items-start gap-5 py-5 border-t border-border/50 hover:bg-muted/20 transition-colors -mx-4 px-4"
                >
                  {/* Plate number */}
                  <span className="text-xl [font-family:'Instrument_Serif',Georgia,serif] italic select-none tabular-nums leading-none text-muted-foreground/25 shrink-0 pt-1 w-6 text-right">
                    {plateNum}
                  </span>

                  {/* Tag name */}
                  <div className="w-36 md:w-44 shrink-0">
                    {isEditingTag ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          autoFocus
                          type="text"
                          className="bg-transparent border-0 border-b border-foreground [font-family:'Instrument_Serif',Georgia,serif] italic text-2xl text-foreground outline-none py-0 w-32"
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
                      <button
                        onClick={() => startEdit(gi, di, "tag")}
                        title="Click to edit tag name"
                        className="group/tag flex items-center gap-2 text-left"
                      >
                        <span className="text-2xl [font-family:'Instrument_Serif',Georgia,serif] italic text-foreground leading-tight">
                          {def.tag}
                        </span>
                        <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover/tag:opacity-50 transition-opacity shrink-0" />
                      </button>
                    )}
                  </div>

                  {/* Definition text */}
                  <div className="flex-1 min-w-0 pt-1">
                    {isEditingDef ? (
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

                  {/* Delete */}
                  <div className="shrink-0 pt-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        if (confirm(`Delete the "${def.tag}" definition?`)) deleteDef(gi, di);
                      }}
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
                <span className="text-xl [font-family:'Instrument_Serif',Georgia,serif] italic select-none tabular-nums leading-none text-muted-foreground/25 shrink-0 pt-1 w-6 text-right">
                  {String(group.definitions.length + 1).padStart(2, "0")}
                </span>
                <div className="w-36 md:w-44 shrink-0">
                  <input
                    autoFocus
                    type="text"
                    placeholder="Tag name"
                    className="bg-transparent border-0 border-b border-foreground [font-family:'Instrument_Serif',Georgia,serif] italic text-2xl text-foreground placeholder:text-muted-foreground/30 outline-none py-0 w-full"
                    value={adding.tag}
                    onChange={(e) => setAdding({ ...adding, tag: e.target.value })}
                  />
                </div>
                <div className="flex-1 flex flex-col gap-2 pt-1">
                  <Textarea
                    placeholder="Definition text…"
                    className="text-sm min-h-[70px] resize-y bg-transparent border-border/50 rounded-none focus-visible:border-foreground focus-visible:ring-0 placeholder:text-muted-foreground/40"
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
                  onClick={() => { setEditing(null); setAdding({ groupIdx: gi, tag: "", definition: "" }); }}
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
          <button
            onClick={resetToDefaults}
            className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4 decoration-border shrink-0"
          >
            Reset Defaults
          </button>
        </div>
      </div>

    </div>
  );
}
