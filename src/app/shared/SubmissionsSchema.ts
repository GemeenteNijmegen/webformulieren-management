import { z } from 'zod';

// Define the schema for the known fields
const knownFieldsSchema = z.object({
  Formuliernaam: z.string(),
  DatumTijdOntvangen: z.string(),
  FormulierKenmerk: z.string(),
  // Add other known fields if needed
});

// Define the schema for additional dynamic fields
const additionalFieldsSchema = z.record(z.string(), z.unknown());

// Combine the known fields schema with additional dynamic fields schema
const completeObjectSchema = z.intersection(
  knownFieldsSchema,
  additionalFieldsSchema,
);

// Define the schema for an array of these objects
export const SubmissionsSchema = z.array(completeObjectSchema);
export type SubmissionsSchemaType = z.infer<typeof SubmissionsSchema>;
export type SubmissionSchemaType = z.infer<typeof completeObjectSchema>;

