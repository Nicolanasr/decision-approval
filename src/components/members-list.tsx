"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";

type Member = {
  id: string;
  user_id: string | null;
  member_name: string | null;
  member_email: string | null;
  member_title: string | null;
  role: string;
};

type MembersListProps = {
  members: Member[];
  isAdmin: boolean;
  currentUserId: string;
  updateMember: (formData: FormData) => void;
  removeMember: (formData: FormData) => void;
};

export function MembersList({
  members,
  isAdmin,
  currentUserId,
  updateMember,
  removeMember,
}: MembersListProps) {
  const [query, setQuery] = React.useState("");
  const [activeEditId, setActiveEditId] = React.useState<string | null>(null);
  const [removeId, setRemoveId] = React.useState<string | null>(null);

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

  const activeRemoveMember =
    removeId ? members.find((member) => member.id === removeId) : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          placeholder="Search members by name or email..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <div className="space-y-3">
        {filteredMembers.length > 0 ? (
          filteredMembers.map((member) => {
            const canEdit = isAdmin;
            const canRemove = isAdmin && member.user_id !== currentUserId;
            const isEditing = activeEditId === member.id;

            return (
              <div
                key={member.id}
                className="flex flex-col gap-3 border-b border-neutral-100 pb-3 last:border-b-0 last:pb-0"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-neutral-800">
                      {member.member_name || "Unnamed member"}
                    </p>
                    {member.member_title ? (
                      <p className="text-xs text-neutral-500">
                        {member.member_title}
                      </p>
                    ) : null}
                    <p className="text-xs text-neutral-400">
                      {member.member_email ?? ""}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      {member.role}
                    </span>
                    {canEdit ? (
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setActiveEditId(isEditing ? null : member.id)
                          }
                        >
                          {isEditing ? "Close" : "Edit"}
                        </Button>
                        {canRemove ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={() => setRemoveId(member.id)}
                          >
                            Remove
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>

                {isEditing ? (
                  <form
                    action={updateMember}
                    className="rounded-md border border-neutral-100 bg-neutral-50 px-3 py-3"
                  >
                    <input type="hidden" name="memberId" value={member.id} />
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="space-y-1">
                        <Label htmlFor={`name-${member.id}`}>Name</Label>
                        <Input
                          id={`name-${member.id}`}
                          name="name"
                          defaultValue={member.member_name ?? ""}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`title-${member.id}`}>Role / Title</Label>
                        <Input
                          id={`title-${member.id}`}
                          name="title"
                          defaultValue={member.member_title ?? ""}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`role-${member.id}`}>Workspace role</Label>
                        <select
                          id={`role-${member.id}`}
                          name="role"
                          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                          defaultValue={member.role}
                        >
                          <option value="member">Member</option>
                          <option value="approver">Approver</option>
                          <option value="auditor">Auditor</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                    </div>
                    <div className="mt-3">
                      <SubmitButton type="submit" pendingText="Saving...">
                        Save changes
                      </SubmitButton>
                    </div>
                  </form>
                ) : null}
              </div>
            );
          })
        ) : (
          <p className="text-sm text-neutral-500">
            No members match that search.
          </p>
        )}
      </div>

      {activeRemoveMember ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-lg">
            <h3 className="text-base font-semibold text-neutral-900">
              Remove {activeRemoveMember.member_name || "member"}?
            </h3>
            <p className="mt-2 text-sm text-neutral-500">
              This will remove them from the workspace. This cannot be undone.
            </p>
            <form action={removeMember} className="mt-4 space-y-3">
              <input
                type="hidden"
                name="memberId"
                value={activeRemoveMember.id}
              />
              <div className="space-y-1">
                <Label htmlFor="confirm-remove">Type REMOVE to confirm</Label>
                <Input id="confirm-remove" name="confirmText" placeholder="REMOVE" />
              </div>
              <label className="flex items-center gap-2 text-xs text-neutral-600">
                <input type="checkbox" name="confirmChecked" className="h-4 w-4" />
                I understand this will remove the member.
              </label>
              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRemoveId(null)}
                >
                  Cancel
                </Button>
                <SubmitButton type="submit" variant="destructive" pendingText="Removing...">
                  Remove member
                </SubmitButton>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
