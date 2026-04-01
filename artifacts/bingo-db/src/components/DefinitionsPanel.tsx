import { Badge } from "@/components/ui/badge";
import { BookOpen, Info } from "lucide-react";

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

const GROUPS: ColumnGroup[] = [
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

function getTagColor(column: string, tag: string): string {
  if (tag === "All") return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700";
  switch (column) {
    case "Region": return "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300 border-violet-200 dark:border-violet-800";
    case "Surroundings": return "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300 border-sky-200 dark:border-sky-800";
    case "Day / Night": return tag === "Day"
      ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800"
      : "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800";
    case "Age": return "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800";
    case "Findability":
      if (tag === "High") return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200";
      if (tag === "Medium") return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 border-yellow-200";
      return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-200";
    case "Season": return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:border-green-800";
    default: return "bg-secondary text-secondary-foreground";
  }
}

export default function DefinitionsPanel() {
  return (
    <div className="max-w-3xl space-y-6 py-2">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h2 className="text-base font-semibold">Tag Definitions</h2>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            These definitions describe each tag value used in the word database. They guide how words are categorized
            and are referenced by the AI when suggesting new words or filling in missing tags.
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium shrink-0">
          <Info className="h-3.5 w-3.5" />
          Used by AI Autofill
        </div>
      </div>

      {/* Groups */}
      {GROUPS.map((group) => (
        <div key={group.column} className="rounded-lg border bg-card overflow-hidden">
          {/* Group header */}
          <div className="flex items-center gap-2.5 px-4 py-3 border-b bg-muted/40">
            <span className="text-lg leading-none">{group.emoji}</span>
            <div className="flex-1">
              <h3 className="font-semibold text-sm">{group.column}</h3>
              <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{group.description}</p>
            </div>
            <Badge variant="outline" className="text-[10px] shrink-0 text-muted-foreground">
              {group.definitions[0].type}
            </Badge>
          </div>

          {/* Definitions list */}
          <div className="divide-y divide-border/60">
            {group.definitions.map((def) => (
              <div key={def.tag} className="flex items-start gap-3 px-4 py-3">
                <Badge
                  variant="outline"
                  className={`text-xs px-2 py-0.5 font-semibold shrink-0 mt-0.5 ${getTagColor(group.column, def.tag)}`}
                >
                  {def.tag}
                </Badge>
                <p className="text-sm text-muted-foreground leading-relaxed">{def.definition}</p>
              </div>
            ))}
          </div>
        </div>
      ))}

      <p className="text-xs text-muted-foreground text-center pb-4">
        Definitions sourced from the original Road Trip Bingo design document.
      </p>
    </div>
  );
}
