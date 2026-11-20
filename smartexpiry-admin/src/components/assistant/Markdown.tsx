import Link from "next/link";
import { Fragment, type ReactNode } from "react";

/**
 * Small, safe Markdown renderer for AI replies: paragraphs, headings, bullet and
 * numbered lists, tables, **bold**, *italic*, `code` and links. Never renders HTML.
 * Only links to pages inside this app (starting with "/") are clickable.
 */

function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\)|\*[^*\s][^*]*\*)/g;
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(re)) {
    if (m.index! > last) out.push(<Fragment key={`${keyBase}-t${i++}`}>{text.slice(last, m.index)}</Fragment>);
    const token = m[0];
    const key = `${keyBase}-m${i++}`;
    if (token.startsWith("**")) out.push(<strong key={key} className="font-semibold text-foreground">{token.slice(2, -2)}</strong>);
    else if (token.startsWith("`")) out.push(<code key={key} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">{token.slice(1, -1)}</code>);
    else if (token.startsWith("[")) {
      const [, label, href] = token.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/) ?? [];
      out.push(
        href && href.startsWith("/") && !href.startsWith("//") ? (
          <Link key={key} href={href} className="font-medium text-primary underline-offset-2 hover:underline">
            {label}
          </Link>
        ) : (
          <Fragment key={key}>{label}</Fragment>
        ),
      );
    } else out.push(<em key={key}>{token.slice(1, -1)}</em>);
    last = m.index! + token.length;
  }
  if (last < text.length) out.push(<Fragment key={`${keyBase}-end`}>{text.slice(last)}</Fragment>);
  return out;
}

const isTableRow = (l: string) => /^\s*\|.*\|\s*$/.test(l);
const cells = (l: string) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());

export function Markdown({ text }: { text: string }) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let k = 0;

  while (i < lines.length) {
    const line = lines[i]!;
    if (!line.trim()) {
      i++;
      continue;
    }
    const key = `b${k++}`;

    const heading = line.match(/^#{1,6}\s+(.*)$/);
    if (heading) {
      blocks.push(<p key={key} className="font-semibold text-foreground">{inline(heading[1]!, key)}</p>);
      i++;
      continue;
    }

    if (isTableRow(line) && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1]!)) {
      const head = cells(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && isTableRow(lines[i]!)) rows.push(cells(lines[i++]!));
      blocks.push(
        <div key={key} className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>{head.map((h, j) => <th key={j} className="px-3 py-2 font-semibold">{inline(h, `${key}h${j}`)}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r, ri) => (
                <tr key={ri}>{r.map((c, j) => <td key={j} className="px-3 py-2 tabular-nums">{inline(c, `${key}r${ri}c${j}`)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    const bullet = /^\s*[-*•]\s+(.*)$/;
    const numbered = /^\s*\d+[.)]\s+(.*)$/;
    if (bullet.test(line) || numbered.test(line)) {
      const ordered = numbered.test(line) && !bullet.test(line);
      const re = ordered ? numbered : bullet;
      const items: string[] = [];
      while (i < lines.length && re.test(lines[i]!)) items.push(lines[i++]!.match(re)![1]!);
      const List = ordered ? "ol" : "ul";
      blocks.push(
        <List key={key} className={ordered ? "list-decimal space-y-1 pl-5 marker:text-muted-foreground" : "list-disc space-y-1 pl-5 marker:text-primary"}>
          {items.map((it, j) => <li key={j} className="pl-1 leading-relaxed">{inline(it, `${key}i${j}`)}</li>)}
        </List>,
      );
      continue;
    }

    const para: string[] = [];
    while (i < lines.length && lines[i]!.trim() && !/^#{1,6}\s/.test(lines[i]!) && !bullet.test(lines[i]!) && !numbered.test(lines[i]!) && !isTableRow(lines[i]!)) {
      para.push(lines[i++]!.trim());
    }
    blocks.push(
      <p key={key} className="leading-relaxed">
        {para.map((p, j) => (
          <Fragment key={j}>
            {j > 0 && <br />}
            {inline(p, `${key}p${j}`)}
          </Fragment>
        ))}
      </p>,
    );
  }

  return <div className="space-y-3">{blocks}</div>;
}
