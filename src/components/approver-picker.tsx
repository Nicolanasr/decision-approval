"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";

type Member = {
  id: string;
  user_id: string | null;
  member_name: string | null;
  member_email: string | null;
  member_title: string | null;
};

type ApproverPickerProps = {
  members: Member[];
  selectedApprovers?: string[];
};

export function ApproverPicker({ members, selectedApprovers }: ApproverPickerProps) {
  const [query, setQuery] = React.useState("");

  const filteredMembers = React.useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) {
      return members;
    }
    return members.filter((member) => {
      const name = member.member_name?.toLowerCase() ?? "";
      const email = member.member_email?.toLowerCase() ?? "";
      return name.includes(term) || email.includes(term);
    });
  }, [members, query]);

  return (
    <div className="space-y-2">
      <Input
        placeholder="Search members by name or email..."
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <div className="space-y-2 rounded-md border border-input bg-background p-3 text-sm">
        {filteredMembers.length > 0 ? (
          filteredMembers.map((member) => (
            <label key={member.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                name="approvers"
                value={member.user_id ?? ""}
                disabled={!member.user_id}
                className="h-4 w-4"
                defaultChecked={
                  Boolean(member.user_id) &&
                  (selectedApprovers ?? []).includes(member.user_id ?? "")
                }
              />
              <span className="text-neutral-700">
                {member.member_name || member.member_email || "Member"}
              </span>
              {member.member_title ? (
                <span className="text-xs text-neutral-400">
                  {member.member_title}
                </span>
              ) : null}
              <span className="text-xs text-neutral-400">
                {member.member_email ?? ""}
              </span>
            </label>
          ))
        ) : (
          <p className="text-sm text-neutral-500">No members match that search.</p>
        )}
      </div>
    </div>
  );
}
