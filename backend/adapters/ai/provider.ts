import type { DraftInput } from '../../validation/ai.ts';
import type { AiCategory } from '../../prompts/listingDraft.ts';
export type ProviderInput = DraftInput & { images: Buffer[]; categories: AiCategory[] };
export type ProviderResult = { output: unknown; usage: { inputTokens: number; outputTokens: number } };
export interface ListingAiProvider { generate(input: ProviderInput, signal: AbortSignal): Promise<ProviderResult> }
