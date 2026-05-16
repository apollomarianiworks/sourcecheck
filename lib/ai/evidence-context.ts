import type { CheckResult, SourceMeshReport } from "@/lib/types";
import type { EvidenceContext, ProofbaseAssistantMode } from "./types";

export function buildEvidenceContext(args: {
  mode: ProofbaseAssistantMode;
  question: string;
  checkResult?: CheckResult | null;
  sourceMesh?: SourceMeshReport | null;
  userText?: string[];
  collectionNotes?: string[];
}): EvidenceContext {
  const report = args.sourceMesh ?? args.checkResult?.sourceMesh ?? null;
  return {
    query: args.question,
    cleanedQuery: report?.understanding.cleanedInput ?? args.checkResult?.normalizedInput ?? args.question.trim(),
    mode: args.mode,
    sourceMesh: report,
    evidence: args.checkResult?.evidence ?? [],
    savedCollectionNotes: args.collectionNotes?.filter(Boolean).slice(0, 20) ?? [],
    userProvidedText: args.userText?.filter(Boolean).slice(0, 20) ?? [],
    publicMetadata: report?.social
      ? [
          report.social.metadata.title,
          report.social.metadata.caption,
          report.social.metadata.authorName,
          ...report.social.metadata.likelyClaims,
        ].filter((value): value is string => !!value)
      : [],
  };
}

export function hasGrounding(context: EvidenceContext): boolean {
  return context.evidence.length > 0 || context.savedCollectionNotes.length > 0 || context.userProvidedText.length > 0 || context.publicMetadata.length > 0;
}
