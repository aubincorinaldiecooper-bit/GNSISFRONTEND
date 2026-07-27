import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listRepositories, listRepositoryIntelligence, type RepositoryIntelligence, type RepositoryRecord } from "@/lib/api";

function provenance(item: RepositoryIntelligence) {
  const facts = [item.type, item.source_model && `Source model: ${item.source_model}`, item.approved_by && `Approved by ${item.approved_by}`].filter(Boolean);
  return facts.join(" · ");
}

export default function IntelligencePage() {
  const [repositories, setRepositories] = useState<RepositoryRecord[]>([]);
  const [repositoryId, setRepositoryId] = useState("");
  const [items, setItems] = useState<RepositoryIntelligence[]>([]);
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => { void listRepositories({ limit: 100 }).then((repos) => {
    setRepositories(repos); setState(repos.length ? "loading" : "loaded"); setRepositoryId((current) => current || repos[0]?.id || "");
  }, () => setState("error")); }, []);
  useEffect(() => {
    if (!repositoryId) return;
    let cancelled = false;
    void listRepositoryIntelligence(repositoryId).then(
      (result) => { if (!cancelled) { setItems(result.data); setState("loaded"); } },
      () => { if (!cancelled) setState("error"); },
    );
    return () => { cancelled = true; };
  }, [repositoryId, attempt]);

  return <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-8">
    <h1 className="text-lg font-semibold">Intelligence</h1>
    <p className="mt-1 text-sm text-muted-foreground">Approved, repository-scoped insights available to later runs.</p>
    <label className="mt-6 block text-xs font-medium">Repository
      <select aria-label="Intelligence repository" className="mt-1 block h-10 w-full rounded-md border bg-background px-3 text-sm" value={repositoryId} onChange={(event) => { setState("loading"); setRepositoryId(event.target.value); }}>
        {repositories.map((repo) => <option key={repo.id} value={repo.id}>{repo.full_name}</option>)}
      </select>
    </label>
    {state === "loading" ? <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading intelligence…</div>
      : state === "error" ? <div className="py-10"><p className="flex items-center gap-2 text-sm"><AlertTriangle className="h-4 w-4" />Intelligence could not be loaded.</p><Button className="mt-3" variant="outline" size="sm" onClick={() => { setState("loading"); setAttempt((value) => value + 1); }}><RefreshCw className="h-3.5 w-3.5" />Retry</Button></div>
      : items.length === 0 ? <p className="py-10 text-sm text-muted-foreground">No approved intelligence yet.</p>
      : <ul className="mt-6 divide-y border-y">{items.map((item) => <li key={item.id} className="py-4">
        <p className="text-sm leading-relaxed">{item.content}</p>
        {provenance(item) && <p className="mt-1 text-xs text-muted-foreground">{provenance(item)}</p>}
        <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
          {item.source_run_id && <a className="underline" href={`/runs/${encodeURIComponent(item.source_run_id)}`}>Source run</a>}
          {item.approved_at && <time dateTime={item.approved_at}>Approved {new Date(item.approved_at).toLocaleString()}</time>}
          {item.created_at && <time dateTime={item.created_at}>Created {new Date(item.created_at).toLocaleString()}</time>}
        </div>
      </li>)}</ul>}
  </div>;
}
