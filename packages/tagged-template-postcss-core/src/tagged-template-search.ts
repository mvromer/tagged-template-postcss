/**
 * Searches the given source code string and returns all tagged template expressions found.
 *
 * @param code Source code string to parse for tagged template expressions.
 *
 * @returns List of {@link TaggedTemplateSearchResult} objects describing each of the found tagged
 * template expressions found in given source code string.
 */
export type FindTaggedTemplatesFunc = (code: string) => TaggedTemplateSearchResult[];

/**
* Information on a tagged template expression found by a {@link FindTaggedTemplatesFunc}.
*/
export interface TaggedTemplateSearchResult {
  /**
  * Name of the identifier preceding the template literal in the tagged template expression.
  * Typically this identifier names the tagged template's tag function.
  */
  tagName: string;

  /**
  * Index pointing to the first character after the opening backtick in the tagged template. This
  * points to the start of the template literal contents in the tagged template expression. The
  * index is calculated from the start of the code string from which the tagged template expression
  * was parsed.
  */
  literalContentsStart: number;

  /**
  * Index pointing to the closing backtick in the tagged template. This points to one character
  * after the end of the template literal contents in the tagged template expression. The index is
  * calculated from the start of the code string from which the tagged template expression was
  * parsed.
  */
  literalContentsEnd: number;
}
