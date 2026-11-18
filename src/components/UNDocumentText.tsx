import { unDocumentLinks } from "@/lib/unDocumentLinks";
import type { ReactNode } from "react";

export function UNDocumentLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-un-blue-text underline"
    >
      {children}
    </a>
  );
}

export function UNDocumentText({ text }: { text: string }) {
  return unDocumentLinks(text).map((part, index) =>
    part.href ? (
      <UNDocumentLink key={index} href={part.href}>
        {part.text}
      </UNDocumentLink>
    ) : (
      part.text
    ),
  );
}
