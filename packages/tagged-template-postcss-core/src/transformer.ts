import { railAsync } from '@arrows/composition';
import TraceError from 'trace-error';

import type MagicString from 'magic-string';
import type { SourceMap } from 'magic-string';

import { processTaggedTemplates, resolvePostcssConfig } from './postcss.js';

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

type Transformer = (code: string, id: string, options?: TransformerOptions) => Promise<TransformerResult>;

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

export async function buildTransformer(
  findTaggedTemplates: FindTaggedTemplatesFunc,
  options: TaggedTemplatePostcssOptions
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
