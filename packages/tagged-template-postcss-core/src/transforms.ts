import { pipe } from '@arrows/composition';

/**
 * Transform function applied to the output of PostCSS.
 *
 * @param transformedLiteralContents Contents of a tagged template literal that has
 * already been transformed by PostCSS and any prior transform functions.
 *
 * @returns The template literal contents with this function's transformations applied.
 */
export type TransformFunc = (transformedLiteralContents: string) => string;

/**
 * Convert each occurrence of \ with \\.
 */
const escapeBackslash = (contents: string) => contents.replace(/\\/g, '\\\\');

/**
 * Convert each occurrence of ` with \`.
 */
const escapeBacktick = (contents: string) => contents.replace(/`/g, '\\`');

/**
 * Convert each occurrence of ${ with \${.
 */
const escapePlaceholderOpening = (contents: string) => contents.replace(/\$\{/g, '\\${');

export const standardOutputTransform = pipe(
  // Backslash escaping comes first so we don't we don't inadvertently escape any escape sequences
  // subsequent functions in the pipeline add to the transformed output.
  escapeBackslash,
  escapeBacktick,
  escapePlaceholderOpening
);
