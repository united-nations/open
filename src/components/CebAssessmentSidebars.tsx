"use client";

import { useCallback, useEffect } from "react";
import { ContributorSidebar } from "@/components/ContributorSidebar";
import { EntitySidebar } from "@/components/EntitySidebar";
import { clearSidebarHash, useDeepLink } from "@/hooks/useDeepLink";
import { useYearResource } from "@/hooks/useYearResource";
import { CEB_ASSESSMENTS_HASH, loadCebAssessments } from "@/lib/cebAssessments";
import { loadCebAssessmentOutstanding } from "@/lib/cebAssessmentOutstanding";
import { loadStaticData } from "@/lib/data";
import {
  createUncategorizedEntity,
  normalizeEntityForDisplay,
} from "@/lib/entities";
import { useYearRanges } from "@/lib/useYearRanges";
import type { Entity } from "@/types";

type Selection =
  | { kind: "contributor"; id: string; year: number }
  | { kind: "entity"; entity: Entity; year: number };

/** Use the existing detail panels without leaving the Assessments tab. */
export function CebAssessmentSidebars() {
  const ranges = useYearRanges();
  const [contributorLink, setContributorLink] = useDeepLink({
    hashPrefix: CEB_ASSESSMENTS_HASH,
  });
  const [entityLink, setEntityLink] = useDeepLink({ hashPrefix: "entity" });
  const kind = contributorLink ? "contributor" : entityLink ? "entity" : null;
  const [id, rawYear, section] = (contributorLink ?? entityLink ?? "").split(
    "@",
  );
  const years =
    kind === "contributor"
      ? ranges.cebAssessments.years
      : [
          ...new Set([
            ...ranges.cebAssessments.years,
            ...ranges.cebAssessmentOutstanding.years,
          ]),
        ];
  const year = years.includes(Number(rawYear))
    ? Number(rawYear)
    : Math.max(...years);
  const load = useCallback(async (): Promise<Selection | null> => {
    if (!kind || !id) return null;
    const [annualResult, balanceResult] = await Promise.allSettled([
      ranges.cebAssessments.years.includes(year)
        ? loadCebAssessments(year)
        : Promise.resolve(null),
      kind === "entity" && ranges.cebAssessmentOutstanding.years.includes(year)
        ? loadCebAssessmentOutstanding(year)
        : Promise.resolve(null),
    ]);
    const annual =
      annualResult.status === "fulfilled" ? annualResult.value : null;
    const balance =
      balanceResult.status === "fulfilled" ? balanceResult.value : null;
    if (kind === "contributor") {
      if (annualResult.status === "rejected")
        throw new Error("Assessment details could not be loaded.");
      return annual?.contributors.some((row) => row.id === id)
        ? { kind, id, year }
        : null;
    }
    const present =
      annual?.contributors.some(({ rows }) =>
        rows.some(([entity]) => entity === id),
      ) || balance?.organizations.some(({ entity }) => entity === id);
    if (!present) {
      if (
        annualResult.status === "rejected" ||
        balanceResult.status === "rejected"
      )
        throw new Error("Organization details could not be loaded.");
      return null;
    }
    const directory = await loadStaticData<Entity[]>("entities.json").catch(
      () => [],
    );
    return {
      kind,
      year,
      entity: normalizeEntityForDisplay(
        directory.find(({ entity }) => entity === id) ??
          createUncategorizedEntity(id),
      ),
    };
  }, [
    kind,
    id,
    year,
    ranges.cebAssessments.years,
    ranges.cebAssessmentOutstanding.years,
  ]);
  const { value, loading, error } = useYearResource<Selection | null>(
    `${kind}:${id}@${year}`,
    null,
    !kind,
    load,
    null,
  );
  const close = useCallback(() => {
    setContributorLink(null);
    setEntityLink(null);
    clearSidebarHash();
  }, [setContributorLink, setEntityLink]);
  useEffect(() => {
    if (!kind || loading || error || value) return;
    const expected = contributorLink ?? entityLink;
    const prefix = `#${kind === "contributor" ? CEB_ASSESSMENTS_HASH : "entity"}=`;
    const timer = window.setTimeout(() => {
      // A stale lookup must not clear a link on a page the user just opened.
      if (
        window.location.pathname
          .replace(/\/+$/, "")
          .endsWith("/system/assessments") &&
        window.location.hash.startsWith(prefix) &&
        decodeURIComponent(window.location.hash.slice(prefix.length)) ===
          expected
      )
        close();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [kind, loading, error, value, close, contributorLink, entityLink]);
  return (
    <>
      {loading && kind && (
        <span className="sr-only" role="status">
          Loading details…
        </span>
      )}
      {error && (
        <p
          role="alert"
          className="fixed right-4 bottom-4 z-50 rounded border border-gray-200 bg-white p-3 text-sm shadow"
        >
          Details could not be loaded.
        </p>
      )}
      {value?.kind === "contributor" && (
        <ContributorSidebar
          key={`contributor:${value.id}@${value.year}`}
          assessmentId={value.id}
          initialYear={value.year}
          initialSection="assessments"
          onClose={close}
        />
      )}
      {value?.kind === "entity" && (
        <EntitySidebar
          key={`entity:${value.entity.entity}@${value.year}:${section ?? "assessments"}`}
          entity={value.entity}
          spending={null}
          revenue={null}
          initialDataComplete={false}
          initialYear={value.year}
          initialSection={
            section === "outstanding" ? "outstanding" : "assessments"
          }
          onClose={close}
        />
      )}
    </>
  );
}
