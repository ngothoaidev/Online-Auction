import type { DraftInput } from '../../validation/ai.ts';
import type { AiCategory } from '../../prompts/listingDraft.ts';
export type ProviderInput = DraftInput & { images: Buffer[]; categories: AiCategory[] };
export type ProviderResult = { output: unknown; usage: { inputTokens: number; outputTokens: number } | null };
export interface ListingAiProvider { generate(input: ProviderInput, signal: AbortSignal): Promise<ProviderResult> }
