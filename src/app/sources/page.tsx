"use client";

import { useEffect, useState } from "react";
import { useMcp } from "@/hooks/use-mcp";

interface DatasetCard {
  datasetId: string;
  name: string;
  description: string;
  category: string;
  geographicCoverage: string;
  availablePeriod: { start: string; end: string };
  indicators: string[];
  sourceUrl: string;
  publicationTitle: string;
  limitations: string;
}

export default function SourcesPage() {
  const { callTool } = useMcp();
  const [datasets, setDatasets] = useState<DatasetCard[]>([]);

  useEffect(() => {
    void callTool("search_datasets", {}).then((body) => {
      setDatasets((body.result as { datasets?: DatasetCard[] } | null)?.datasets ?? []);
    });
  }, [callTool]);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs tracking-[0.16em] text-[var(--muted)] uppercase">Provenance</p>
        <h1 className="font-serif text-4xl sm:text-5xl">Where the numbers were printed.</h1>
      </header>
      <div className="grid gap-4">
        {datasets.map((dataset) => (
          <article key={dataset.datasetId} className="surface rounded-3xl p-6">
            <p className="text-xs tracking-[0.14em] text-[var(--muted)] uppercase">{dataset.category}</p>
            <h2 className="mt-1 font-serif text-3xl">{dataset.name}</h2>
            <p className="mt-3 max-w-3xl leading-7">{dataset.description}</p>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-[var(--muted)]">Publication</dt>
                <dd>{dataset.publicationTitle}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">Coverage</dt>
                <dd>
                  {dataset.geographicCoverage}. {dataset.availablePeriod.start} to {dataset.availablePeriod.end}.
                </dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">Indicators</dt>
                <dd>{dataset.indicators.join(", ")}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">Limits</dt>
                <dd>{dataset.limitations}</dd>
              </div>
            </dl>
            <a className="mt-4 inline-block text-sm underline" href={dataset.sourceUrl} target="_blank" rel="noreferrer">
              Open the NBS catalogue record
            </a>
          </article>
        ))}
      </div>
    </div>
  );
}
