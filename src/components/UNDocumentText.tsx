import { unDocumentLinks } from "@/lib/unDocumentLinks";

export function UNDocumentText({ text }: { text: string }) {
  return unDocumentLinks(text).map((part, index) =>
    part.href ? (
      <a
        key={index}
        href={part.href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-un-blue-text underline"
      >
        {part.text}
      </a>
    ) : (
      part.text
    ),
  );
}
