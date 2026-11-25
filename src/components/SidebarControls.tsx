"use client";

import { Check, Share2, X } from "lucide-react";
import { useState } from "react";
import {
  DetailPanelControls,
  type DetailPanelAction,
} from "@un-eosg/ui/components/detail-panel-controls";

interface SidebarControlsProps {
  onClose: () => void;
  closeLabel: string;
  shareHash?: string;
}

export function SidebarControls({
  onClose,
  closeLabel,
  shareHash,
}: SidebarControlsProps) {
  const [copied, setCopied] = useState(false);
  const share = useShareAction(shareHash, copied, setCopied);
  const close = action(closeLabel, onClose, <X className="size-4" />);

  return (
    <div className="relative">
      <DetailPanelControls
        share={share}
        resize={{
          expandLabel: "Expand to full width",
          collapseLabel: "Restore sidebar width",
        }}
        close={close}
      />
      {copied && (
        <span
          role="status"
          className="absolute end-0 top-full mt-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm whitespace-nowrap text-slate-800 shadow-lg"
        >
          Link copied!
        </span>
      )}
    </div>
  );
}

function action(label: string, onClick: () => void, icon: React.ReactNode) {
  return { label, title: label, onClick, icon } satisfies DetailPanelAction;
}

function useShareAction(
  hash: string | undefined,
  copied: boolean,
  setCopied: (copied: boolean) => void,
) {
  if (!hash) return undefined;
  const label = copied ? "Link copied!" : "Copy link to clipboard";
  const icon = copied ? (
    <Check className="size-4" />
  ) : (
    <Share2 className="size-4" />
  );
  return action(label, () => copySidebarLink(hash, setCopied), icon);
}

async function copySidebarLink(
  hash: string,
  setCopied: (copied: boolean) => void,
) {
  const url = `${window.location.origin}${window.location.pathname}#${hash}`;
  try {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  } catch (error) {
    console.error("Failed to copy URL:", error);
  }
}
