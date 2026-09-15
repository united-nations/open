"use client";
import { formatBudget as sharedFormatBudget } from "@un-eosg/ui/format-budget";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { UninfoProject } from "@/lib/data";
import { UninfoFundingBar } from "@/components/UninfoFundingBar";
import { SDG_COLORS } from "@/lib/sdgs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface UninfoProjectTableProps {
  projects: UninfoProject[];
  initialLimit?: number;
}

function ProjectCard({
  project,
  maxRequired,
}: {
  project: UninfoProject;
  maxRequired: number;
}) {
  const [expanded, setExpanded] = useState(false);

  const barWidth = (project.required / maxRequired) * 100;
  const availPct =
    project.required > 0 ? (project.available / project.required) * 100 : 0;
  const spentPct =
    project.required > 0 ? (project.spent / project.required) * 100 : 0;
  const formatAmt = sharedFormatBudget;

  const hasDetails =
    project.description || project.outcome || (project.start && project.end);
  const formatDate = (d: string | null) =>
    d
      ? new Date(d).toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        })
      : null;

  return (
    <div className="rounded border border-gray-200">
      <button
        onClick={() => hasDetails && setExpanded(!expanded)}
        className={`w-full p-2 text-left ${hasDetails ? "cursor-pointer hover:bg-gray-50" : "cursor-default"}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="font-medium text-gray-700">
                {project.agency}
              </span>
              {project.code && (
                <>
                  <span>·</span>
                  <span className="text-gray-400">{project.code}</span>
                </>
              )}
              {project.sdg && (
                <>
                  <span>·</span>
                  <div
                    className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded text-[9px] font-bold text-white"
                    style={{ backgroundColor: SDG_COLORS[project.sdg] }}
                  >
                    {project.sdg}
                  </div>
                </>
              )}
              {hasDetails && (
                <ChevronDown
                  className={`ml-auto h-3 w-3 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`}
                />
              )}
            </div>
            <p
              className={`mt-0.5 text-sm text-gray-900 ${expanded ? "" : "line-clamp-2"}`}
              title={project.name}
            >
              {project.name}
            </p>
          </div>
          <div className="flex-shrink-0 text-right text-xs text-gray-600">
            {formatAmt(project.available)}
          </div>
        </div>
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <div className="mt-2">
              <div
                className="relative h-2 overflow-hidden rounded-sm bg-gray-200"
                style={{ width: `${barWidth}%` }}
              >
                <div
                  className="absolute inset-y-0 left-0 bg-un-blue/30"
                  style={{ width: `${availPct}%` }}
                />
                <div
                  className="absolute inset-y-0 left-0 bg-un-blue"
                  style={{ width: `${spentPct}%` }}
                />
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            className="border border-slate-200 bg-white p-3 text-slate-800 shadow-lg"
          >
            <UninfoFundingBar
              required={project.required}
              available={project.available}
              spent={project.spent}
              compact
            />
          </TooltipContent>
        </Tooltip>
      </button>

      {expanded && hasDetails && (
        <div className="space-y-2 border-t border-gray-100 bg-gray-50 px-2 py-2 text-xs">
          {project.start && project.end && (
            <div className="flex gap-2 text-gray-500">
              <span className="font-medium text-gray-600">Timeline:</span>
              <span>
                {formatDate(project.start)} – {formatDate(project.end)}
              </span>
            </div>
          )}
          {project.outcome && (
            <div>
              <span className="font-medium text-gray-600">Outcome: </span>
              <span className="text-gray-700">{project.outcome}</span>
            </div>
          )}
          {project.description && (
            <div>
              <span className="font-medium text-gray-600">Description: </span>
              <span className="text-gray-700">{project.description}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function UninfoProjectTable({
  projects,
  initialLimit = 5,
}: UninfoProjectTableProps) {
  const [showAll, setShowAll] = useState(false);

  const displayed = showAll ? projects : projects.slice(0, initialLimit);
  const maxRequired =
    displayed.length > 0 ? Math.max(...displayed.map((p) => p.required)) : 1;

  if (projects.length === 0) {
    return <p className="text-xs text-gray-500">No projects found.</p>;
  }

  return (
    <div className="space-y-2">
      {displayed.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          maxRequired={maxRequired}
        />
      ))}

      {!showAll && projects.length > initialLimit && (
        <button
          onClick={() => setShowAll(true)}
          className="text-xs text-gray-600 underline hover:text-gray-900"
        >
          Show all {projects.length} projects
        </button>
      )}
    </div>
  );
}
