/**
 * Builds MPAS Action Packages from MCP tool calls.
 * Constructs the ActionEnvelope, signs the proposal, and assembles
 * the Action Package for submission to the Credential Adapter.
 */

import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { CompactSign, importJWK, type JWK } from "jose";
import { canonicalize } from "json-canonicalize";
import type { ActionEnvelope, ActionPackage, ApprovalBundle, Did, Hash } from "./types.js";

export interface KeyFile {
  did: Did;
  kid: string;
  privateJwk: JWK;
  publicJwk: JWK;
}

export interface ActionPackageBuilderConfig {
  applicationDid: Did;
  executionProfile: { id: Did; format: string };
  keyManager: KeyFile;
  defaultResource?: string;
  expiresInMs?: number;
}

export class ActionPackageBuilder {
  private readonly config: ActionPackageBuilderConfig;

  constructor(config: ActionPackageBuilderConfig) {
    this.config = config;
  }

  static async fromKeyFile(
    keyPath: string,
    applicationDid: Did,
    executionProfile: { id: Did; format: string },
  ): Promise<ActionPackageBuilder> {
    const keyFile = JSON.parse(await readFile(keyPath, "utf8")) as KeyFile;
    return new ActionPackageBuilder({ applicationDid, executionProfile, keyManager: keyFile });
  }

  async buildFromToolCall(toolName: string, args: object, resource?: string): Promise<ActionPackage> {
    const executionPayload = { name: toolName, arguments: args };
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (this.config.expiresInMs ?? 3_600_000));

    const actionEnvelope: ActionEnvelope = {
      version: "1",
      type: "ActionEnvelope",
      proposer: { did: this.config.keyManager.did },
      target: {
        applicationDid: this.config.applicationDid,
        resource: resource ?? this.config.defaultResource,
      },
      executionProfile: this.config.executionProfile,
      executionPayloadHash: hashJson(executionPayload),
      actionId: { value: `urn:uuid:${randomUUID()}` },
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    const actionEnvelopeHash = hashJson(actionEnvelope);
    const proposalApproval = await this.signApproval(actionEnvelopeHash, "propose", now.toISOString());

    const approvalBundle: ApprovalBundle = {
      version: "1",
      type: "ApprovalBundle",
      actionEnvelopeHash,
      approvals: [proposalApproval],
      assembledBy: this.config.keyManager.did,
      createdAt: now.toISOString(),
    };

    return {
      version: "1",
      type: "ActionPackage",
      executionPayload,
      actionEnvelope,
      approvalBundle,
      createdAt: now.toISOString(),
    };
  }

  private async signApproval(actionEnvelopeHash: Hash, decision: string, createdAt: string) {
    const payload = {
      type: "ApprovalPayload",
      actionEnvelopeHash,
      decision,
      signerDid: this.config.keyManager.did,
      createdAt,
    };

    const key = await importJWK(this.config.keyManager.privateJwk, "EdDSA");
    const signature = await new CompactSign(Buffer.from(canonicalize(payload)))
      .setProtectedHeader({ alg: "EdDSA", kid: this.config.keyManager.kid })
      .sign(key);

    return {
      version: "1" as const,
      type: "Approval" as const,
      actionEnvelopeHash,
      decision: decision as "propose",
      signature: { format: "jws" as const, value: signature },
      createdAt,
    };
  }
}

export function hashJson(value: unknown): Hash {
  return {
    alg: "sha-256",
    value: createHash("sha256").update(canonicalize(value)).digest("base64url"),
  };
}
