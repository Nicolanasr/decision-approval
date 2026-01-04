import { z } from "zod";

const trimmedString = z.string().trim();
const requiredString = trimmedString.min(1, "This field is required.");
const optionalString = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  },
  z.string().max(1000).optional()
);

export const authSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

export const workspaceSchema = z.object({
  name: requiredString.min(2, "Workspace name must be at least 2 characters."),
  description: optionalString,
});

export const switchWorkspaceSchema = z.object({
  workspaceId: z.string().uuid("Invalid workspace."),
});

export const profileSchema = z.object({
  name: requiredString.min(2, "Name must be at least 2 characters."),
  title: requiredString.min(2, "Title must be at least 2 characters."),
});

export const inviteSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  name: optionalString,
  title: optionalString,
  role: z
    .enum(["admin", "member", "auditor", "approver"])
    .default("member"),
});

export const addMemberSchema = inviteSchema;

export const updateMemberSchema = z.object({
  memberId: z.string().uuid("Invalid member."),
  name: optionalString,
  title: optionalString,
  role: z.enum(["admin", "member", "auditor", "approver"]).optional(),
});

export const removeMemberSchema = z.object({
  memberId: z.string().uuid("Invalid member."),
  confirmText: z.literal("REMOVE", {
    errorMap: () => ({ message: "Type REMOVE to confirm." }),
  }),
  confirmChecked: z.literal(true, {
    errorMap: () => ({ message: "Confirm the removal checkbox." }),
  }),
});

export const acceptInviteSchema = z.object({
  token: z.string().uuid("Invalid invite."),
  name: optionalString,
  title: optionalString,
});

export const decisionSchema = z.object({
  title: requiredString.min(2, "Title must be at least 2 characters."),
  summary: requiredString.min(2, "Summary must be at least 2 characters."),
  context: requiredString.min(10, "Context should be at least 10 characters."),
  links: optionalString,
  approvers: z.array(z.string().uuid("Invalid approver.")).default([]),
});

export const decisionUpdateSchema = decisionSchema.extend({
  decisionId: z.string().uuid("Invalid decision."),
});

export const decisionActionSchema = z.object({
  decisionId: z.string().uuid("Invalid decision."),
  action: z.enum(["approve", "reject"]),
});

export const commentSchema = z.object({
  decisionId: z.string().uuid("Invalid decision."),
  body: requiredString.min(1, "Comment cannot be empty."),
});
