"use client";

import { useState } from "react";
import { Check, Copy, Eye, EyeOff, LoaderCircle, Pencil, Trash2 } from "lucide-react";
import { revealEmployeePasswordAction } from "@/app/(dashboard)/employees/actions";
import { cn } from "@/lib/utils";
import type { EmployeeRow } from "@/lib/employees/list";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

const MAX_STORE_CHIPS = 2;

type EmployeeTableProps = {
  rows: EmployeeRow[];
  onEdit: (employee: EmployeeRow) => void;
  onDelete: (employee: EmployeeRow) => void;
};

export function EmployeeTable({ rows, onEdit, onDelete }: EmployeeTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1100px] text-left text-sm">
        <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th scope="col" className="px-4 py-3 font-semibold">Employee</th>
            <th scope="col" className="px-4 py-3 font-semibold">Contact</th>
            <th scope="col" className="px-4 py-3 font-semibold">Designation</th>
            <th scope="col" className="px-4 py-3 font-semibold">Stores</th>
            <th scope="col" className="px-4 py-3 font-semibold">Status</th>
            <th scope="col" className="px-4 py-3 font-semibold">Password</th>
            <th scope="col" className="px-4 py-3 font-semibold">Added</th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((e) => (
            <tr key={e.id} className="transition-colors hover:bg-muted/40">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  {e.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- authenticated API image
                    <img src={e.avatarUrl} alt="" className="size-9 shrink-0 rounded-full object-cover" />
                  ) : (
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
                      {initials(e.name)}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-medium">{e.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">{e.employeeCode}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <p className="max-w-56 truncate">{e.email}</p>
                <p className="text-xs text-muted-foreground">{e.phone}</p>
              </td>
              <td className="px-4 py-3">{e.designation}</td>
              <td className="px-4 py-3">
                <div className="flex max-w-60 flex-wrap gap-1">
                  {e.stores.slice(0, MAX_STORE_CHIPS).map((s) => (
                    <span key={s.id} title={s.code} className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                      {s.name}
                    </span>
                  ))}
                  {e.stores.length > MAX_STORE_CHIPS && (
                    <span
                      title={e.stores.slice(MAX_STORE_CHIPS).map((s) => s.name).join(", ")}
                      className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                    >
                      +{e.stores.length - MAX_STORE_CHIPS}
                    </span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium",
                    e.status === "ACTIVE" ? "bg-success-soft text-success" : "bg-muted text-muted-foreground",
                  )}
                >
                  {e.status === "ACTIVE" ? "Active" : "Inactive"}
                </span>
              </td>
              <td className="px-4 py-3">
                <PasswordCell employeeId={e.id} name={e.name} available={e.hasViewablePassword} />
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{e.createdAt}</td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => onEdit(e)}
                    aria-label={`Edit ${e.name}`}
                    title="Edit"
                    className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Pencil className="size-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(e)}
                    aria-label={`Delete ${e.name}`}
                    title="Delete"
                    className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-danger-soft hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Copies text; falls back to execCommand where the Clipboard API is unavailable (plain-HTTP LAN access). */
async function copyText(text: string) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  document.execCommand("copy");
  area.remove();
}

/** Masked password with Show / Copy. The value is fetched from the server only when asked for. */
function PasswordCell({ employeeId, name, available }: { employeeId: string; name: string; available: boolean }) {
  const [password, setPassword] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!available) {
    return (
      <span className="text-xs text-muted-foreground" title="Set before passwords could be viewed">
        Not available
      </span>
    );
  }

  async function load() {
    if (password) return password;
    setLoading(true);
    setError(null);
    try {
      const res = await revealEmployeePasswordAction(employeeId);
      if (!res.ok) {
        setError(res.message);
        return null;
      }
      setPassword(res.password);
      return res.password;
    } catch {
      setError("Couldn't load the password.");
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function toggle() {
    if (visible) return setVisible(false);
    if (await load()) setVisible(true);
  }

  async function copy() {
    const value = await load();
    if (!value) return;
    try {
      await copyText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Couldn't copy.");
    }
  }

  const iconButton =
    "rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

  return (
    <div className="flex items-center gap-1">
      <span className="min-w-24 font-mono text-xs" data-testid="password-value">
        {visible && password ? password : "••••••••"}
      </span>
      <button type="button" onClick={toggle} disabled={loading} className={iconButton} aria-label={`${visible ? "Hide" : "Show"} password for ${name}`}>
        {loading ? <LoaderCircle className="size-4 animate-spin" /> : visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
      <button type="button" onClick={copy} disabled={loading} className={iconButton} aria-label={`Copy password for ${name}`}>
        {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
      </button>
      {error && (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}
    </div>
  );
}
