import { z } from "zod";
import { PLATFORMS, TONES, type GenerateRequest } from "@/types/db";

/** Caption generator request schema, shared by the Generator form (client) and POST /api/generate (server). */
export const generateSchema = z.object({
  prompt: z
    .string({ error: "Describe what the post is about." })
    .trim()
    .min(3, "Describe the post in at least 3 characters.")
    .max(500, "Keep the prompt under 500 characters."),
  platform: z.enum(PLATFORMS, { error: "Pick a platform." }),
  tone: z.enum(TONES, { error: "Pick a tone." }),
  count: z.union([z.literal(2), z.literal(3)], { error: "Choose 2 or 3 options." }).default(3),
});

export type GenerateInput = z.infer<typeof generateSchema>;

// Compile-time guard: the parsed output must stay assignable to the shared GenerateRequest type.
const _typeCheck: (input: GenerateInput) => GenerateRequest = (input) => input;
void _typeCheck;
