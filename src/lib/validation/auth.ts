import { z } from "zod";

/** Auth schemas shared by the forms (client-side) and the Server Actions (server-side). */

const email = z.string().trim().toLowerCase().email("Enter a valid email address.");

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password."),
});

export const signUpSchema = z
  .object({
    full_name: z.string().trim().min(2, "Tell us your name.").max(80, "That name is a little long."),
    email,
    password: z
      .string()
      .min(8, "Use at least 8 characters.")
      .max(72, "Use at most 72 characters.")
      .regex(/[A-Za-z]/, "Include at least one letter.")
      .regex(/\d/, "Include at least one number."),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords don't match." });
