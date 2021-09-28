import { railAsync } from '@arrows/composition';
import TraceError from 'trace-error';

import type { SourceMap } from 'magic-string';

import { processTaggedTemplates } from './postcss.js';

import type { TaggedTemplatePostcssOptions } from './options.js';
import type { ProcessResult } from './postcss.js';
import type { FindTaggedTemplatesFunc, TaggedTemplateSearchResult } from './tagged-template-search.js';

/**
 * Additional options used to configure the transformer returned by {@link buildTransformer}.
 */
interface TransformerOptions {
  /**
   * If true, the transformer returned by {@link buildTransformer} will generate and return a source
   * map for the transformed source code.
   */
  generateSourceMap?: boolean
}

/**
 * Either a string containing the transformed source code or an object containing both the
 * transformed source code and its source map. The latter is returned if `generateSourceMap` is true
 * in the options passed to the transformer returned by {@link buildTransformer}.
 */
type TransformerResult = string | {
  /**
   * Transformed source code.
   */
  code: string;

  /**
   * Source map for the transformed source code.
   */
  sourceMap: SourceMap;
}

/**
 * Transforms a string of source code by finding all tagged template expressions and processing
 * their template literal contents with PostCSS. The output of PostCSS can optionally be processed
 * by one or more output processors. The original template literal contents are then replaced with
 * the transformed contents.
 *
 * @param code Source code string to transform.
 *
 * @param id An ID string associated with the given source code string. This is typically something
 * like the path to the module whose source code is passed to the {@link code} parameter.
 *
 * @param transformerOptions Additional options used to configure the behavior of the
 * {@link Transformer}.
 *
 * @returns A promise resolving to the result of the {@link Transformer}.
 */
type Transformer = (code: string, id: string, transformerOptions?: TransformerOptions) => Promise<TransformerResult>;

/**
 * Return value of the call to {@link railAsync} used to build the transformer pipeline that
 * processes contents of tagged template literal expressions in the given source code string with
 * PostCSS.
 *
 * @param code Source code string to transform.
 *
 * @returns Either the transformed source code string as a magic string or an error that occurred
 * along the pipeline.
 */
type TransformerPipelineFunc = (code: string) => Promise<ProcessResult | Error>;

/**
 * Builds a {@link Transformer} that can take a string of source code, extract its tagged template
 * expressions whose tag functions have names matching the list of tag names in the given
 * {@link options}, processes their template literal contents through PostCSS and any configured
 * output processors, and then replaces the original template literal contents with the transformed
 * contents. The resulting transformer can be configured with a callback that the caller can use to
 * process any PostCSS dependencies found during the transformation process.
 *
 * @param options Options used to configure the core transformation pipeline.
 *
 * @param findTaggedTemplates Callback used to find all tagged template expressions in a source code
 * string and return them as a list of {@link TaggedTemplateSearchResult} objects.
 *
 * @returns A promise resolving to a {@link Transformer} that can be called to transform a string of
 * source code using a transformation pipeline configured from the given {@link options}.
 */
export async function buildTransformer(
  options: TaggedTemplatePostcssOptions,
  findTaggedTemplates: FindTaggedTemplatesFunc
): Promise<Transformer> {
  return async (code: string, sourceCodeId: string, transformerOptions?: TransformerOptions) => {
    const runTransformPipeline: TransformerPipelineFunc = railAsync(
      findTaggedTemplates,
      (searchResults: TaggedTemplateSearchResult[]) =>
        processTaggedTemplates(searchResults, code, sourceCodeId, options)
    );

    const processResult = await runTransformPipeline(code);

    if (processResult instanceof Error) {
      throw new TraceError(`Failed to transform source code string`, processResult);
    }

    const [modifiedCode, dependencies] = processResult;

    // XXX: Process PostCSS dependencies via callback.

    if (transformerOptions?.generateSourceMap) {
      return {
        code: modifiedCode.toString(),
        sourceMap: modifiedCode.generateMap({ hires: true })
      };
    }

    return modifiedCode.toString();
  };
}
