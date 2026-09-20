import type { DataSource } from "@/lib/types";

/**
 * Shown only when the server could not reach FakeStoreAPI and rendered the
 * committed snapshot instead. Degrading quietly would be worse than degrading
 * visibly: the page keeps working, and nobody is misled about how fresh the
 * numbers are.
 */
export function DataSourceNotice({ source }: { source: DataSource }) {
  if (source === "live") {
    return null;
  }

  return (
    <aside
      className="flex flex-col gap-1 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-200"
      role="status"
    >
      <strong className="font-semibold">Showing a bundled snapshot, not live data.</strong>
      <span className="text-amber-800/90 dark:text-amber-200/80">
        FakeStoreAPI answers requests from datacenter IP ranges — which is what a serverless
        function is — with a Cloudflare challenge page instead of JSON, so this deployment fell back
        to a committed copy of the same catalogue. Run the app locally and the very same code reads
        the live API. Proof, straight from this server:{" "}
        <a className="font-medium underline underline-offset-2" href="/api/health">
          /api/health
        </a>
        .
      </span>
    </aside>
  );
}
