import { Plus, Trash2 } from "lucide-react";
import { NativeSelect } from "@/components/desk/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTournamentStore } from "@/lib/tournament-store";
import { STAFF_ROLES, staffRoleLabel, type StaffRole } from "@/lib/tournament-types";

const ROLE_ORDER = STAFF_ROLES.map((row) => row.id);

export function StaffPanel() {
  const t = useTournamentStore((s) => s.tournament);
  const addStaff = useTournamentStore((s) => s.addStaff);
  const updateStaff = useTournamentStore((s) => s.updateStaff);
  const removeStaff = useTournamentStore((s) => s.removeStaff);
  const staff = [...(t.staff ?? [])].sort(
    (a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role) || a.name.localeCompare(b.name),
  );

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-[0.65rem] tracking-[0.22em] text-muted uppercase">Event staff</p>
          <p className="text-xs text-muted">For the report and archive. Not shown on stream.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => addStaff({ role: staff.length ? "judge" : "head-judge" })}>
          <Plus className="size-3.5" />
          Add
        </Button>
      </div>

      {staff.length === 0 ? (
        <p className="mt-3 text-sm text-muted">
          Add Head Judge, judges, feature match judges, producer, and floor staff for this event.
        </p>
      ) : (
        <ul className="mt-3 grid gap-2">
          {staff.map((row) => (
            <li key={row.id} className="grid gap-1.5 rounded-lg bg-surface-2 p-2">
              <div className="grid grid-cols-[1fr_auto] gap-1.5">
                <Input
                  value={row.name}
                  placeholder="Name"
                  onChange={(e) => updateStaff(row.id, { name: e.target.value })}
                  className="h-8"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Remove ${row.name || staffRoleLabel(row.role)}`}
                  onClick={() => removeStaff(row.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-1.5">
                <NativeSelect
                  value={row.role}
                  onChange={(e) => updateStaff(row.id, { role: e.target.value as StaffRole })}
                  className="h-8"
                >
                  {STAFF_ROLES.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.label}
                    </option>
                  ))}
                </NativeSelect>
                <Input
                  value={row.note}
                  placeholder="Note · optional"
                  onChange={(e) => updateStaff(row.id, { note: e.target.value })}
                  className="h-8"
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
