import { z } from 'zod';

/**
 * Schema to process results from the submissionstorage listformoverview api call
 */
export const FormOverviewResultsSchema = z.array(
  z.object({
    fileName: z.string(),
    createdDate: z.string().datetime(),
    createdBy: z.string(),
    formName: z.string(),
    formTitle: z.string(),
    queryStartDate: z.string(),
    queryEndDate: z.string(),
    appId: z.optional(z.string()),
  }),
);