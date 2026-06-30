/**
 * Coordination Service HTTP client.
 * Used when the Credential Adapter returns "additionalApprovalsRequired".
 * The bridge submits the pending action to the Coordination Service,
 * which solicits approvals from configured approvers.
 */

import type { ActionPackage, Did, Hash } from "../core/types.js";

export interface CoordinationClientConfig {
  /** Base URL of the Coordination Service (e.g., "http://127.0.0.1:7545") */
  url: string;
  /** Timeout in ms */
  timeoutMs?: number;
}

export interface CoordinationSubmitResult {
  state: string;
  actionRef: {
    actionId: { value: string };
    actionEnvelopeHash: Hash;
  };
}

export interface ApprovalRequest {
  version: "1";
  type: "ApprovalRequest";
  actionRef: {
    version: "1";
    type: "ActionReference";
    actionId: { value: string };
    actionEnvelopeHash: Hash;
  };
  requestedDecision: string;
}

export interface PollResponse {
  approvalRequests: ApprovalRequest[];
  actionUpdates: Array<{
    actionRef: { actionId: { value: string }; actionEnvelopeHash: Hash };
    state: string;
    updatedApprovalBundle?: unknown;
  }>;
}

export class CoordinationClient {
  private readonly url: string;
  private readonly timeoutMs: number;

  constructor(config: CoordinationClientConfig) {
    this.url = config.url.replace(/\/$/, "");
    this.timeoutMs = config.timeoutMs ?? 30_000;
  }

  /**
   * Submit a pending action that needs additional approvals.
   * The Coordination Service will track the action and solicit approvals.
   */
  async submitAction(
    actionPackage: ActionPackage,
    authorizationRequirements: unknown,
  ): Promise<CoordinationSubmitResult> {
    const response = await this.post("/mpas/v1/coordination/action", {
      version: "1",
      type: "CoordinationActionRequest",
      actionPackage,
      authorizationRequirements,
    });
    return response as CoordinationSubmitResult;
  }

  /**
   * Poll for pending approval requests assigned to this DID.
   */
  async poll(did: Did): Promise<PollResponse> {
    const response = await this.post("/mpas/v1/coordination/poll", {
      version: "1",
      type: "CoordinationPollRequest",
      did,
    });
    return response as PollResponse;
  }

  /**
   * Submit an approval for a pending action.
   */
  async submitApproval(approval: {
    actionEnvelopeHash: Hash;
    approval: unknown;
  }): Promise<unknown> {
    return this.post("/mpas/v1/coordination/approval", {
      version: "1",
      type: "CoordinationApprovalSubmission",
      ...approval,
    });
  }

  /**
   * Cancel a pending action.
   */
  async cancelAction(actionId: { value: string }, proposerDid: Did): Promise<unknown> {
    return this.post("/mpas/v1/coordination/action-cancel", {
      version: "1",
      type: "CoordinationCancelRequest",
      actionId,
      proposerDid,
    });
  }

  /** Health check */
  async health(): Promise<{ status: string }> {
    const response = await fetch(`${this.url}/mpas/v1/coordination/health`);
    return (await response.json()) as { status: string };
  }

  private async post(path: string, body: unknown): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.url}${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(
          `Coordination Service returned ${response.status}: ${JSON.stringify(error)}`,
        );
      }

      return response.json();
    } finally {
      clearTimeout(timer);
    }
  }
}
