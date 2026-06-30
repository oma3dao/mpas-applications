/**
 * Core MPAS types for the GitHub bridge.
 * Mirrors the types in oma3/mpas/examples/demo/src/core/types.ts.
 */

export type Did = `did:${string}:${string}`;
export type Timestamp = string;

export interface Hash {
  alg: "sha-256" | "sha-384" | "sha-512";
  value: string;
}

export interface ActionId {
  value: string;
  scope?: string;
}

export interface ActionEnvelope {
  version: "1";
  type: "ActionEnvelope";
  proposer: { did: Did };
  target: {
    applicationDid: Did;
    resource?: string;
    [key: string]: unknown;
  };
  executionProfile: {
    id: Did;
    format?: string;
  };
  executionPayloadHash: Hash;
  actionId: ActionId;
  createdAt: Timestamp;
  expiresAt: Timestamp;
}

export interface Approval {
  version: "1";
  type: "Approval";
  actionEnvelopeHash: Hash;
  decision: "propose" | "approve" | "reject" | "abstain";
  signature: { format: "jws"; value: string };
  createdAt: Timestamp;
}

export interface ApprovalBundle {
  version: "1";
  type: "ApprovalBundle";
  actionEnvelopeHash: Hash;
  approvals: Approval[];
  assembledBy?: Did;
  createdAt?: Timestamp;
}

export interface ActionPackage {
  version: "1";
  type: "ActionPackage";
  executionPayload: unknown;
  actionEnvelope: ActionEnvelope;
  approvalBundle: ApprovalBundle;
  createdAt?: Timestamp;
}

export interface ActionResponse {
  version: "1";
  type: "ActionResponse";
  verifier: { did: Did };
  actionEnvelopeHash?: Hash;
  result: string;
  authorizationRequirements?: unknown;
  executionReceipt?: unknown;
  executionResult?: unknown;
  error?: { code: string; message: string };
  createdAt: Timestamp;
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export type ImpactClassification = "low_impact" | "high_impact";
