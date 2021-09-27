import { pipe } from '@arrows/composition';
import { pick } from 'lodash-es';
import MagicString from 'magic-string';
import postcss from 'postcss';
import postcssrc from "postcss-load-config";
import TraceError from 'trace-error';

import type { AcceptedPlugin, Message, ProcessOptions } from 'postcss';

import { standardOutputProcessor } from './output-processor.js';

import type { TaggedTemplatePostcssOptions } from './options.js';
import type { TaggedTemplateSearchResult } from './tagged-template-search.js';

interface ResolvedPostcssConfig {
  /**
   * PostCSS options to use.
   */
  options: Pick<ProcessOptions, 'parser' | 'stringifier' | 'syntax'>;

  /**
   * PostCSS plugins to use.
   */
  plugins: AcceptedPlugin[];
}

export type ProcessResult = [MagicString, Message[]];

/**
 * Takes the PostCSS config given in a {@link TaggedTemplatePostcssOptions} object and resolves it
 * to a set of PostCSS options and plugins. If a config isn't given, then one will be loaded via
 * post-css-load-config.
 *
 * @param postcssConfig A PostCSS config set in a {@link TaggedTemplatePostcssOptions} object.
 *
 * @returns A promise that resolves to an object specifying the PostCSS options and plugins
 * specified either in a {@link TaggedTemplatePostcssOptions} object or in a config loaded by
 * postcss-load-config.
 */
export async function resolvePostcssConfig(postcssConfig: TaggedTemplatePostcssOptions['postcss']): Promise<ResolvedPostcssConfig> {
  const acceptedOptions = ['parser', 'stringifier', 'syntax'];

  if (postcssConfig) {
    const {
      plugins = [],
      ...options
    } = postcssConfig;

    return {
      plugins,
      options: pick(options, acceptedOptions)
    };
  }

  try {
    const loadResult = await postcssrc();
    return {
      plugins: loadResult.plugins,
      options: pick(loadResult.options, acceptedOptions)
    };
  }
  catch (e) {
    const wrappedError = e instanceof Error ? e : new Error(`${e}`);
    throw new TraceError(`PostCSS config must be provided either via options or config file`, wrappedError);
  }
}

export async function processTaggedTemplates(
  taggedTemplateSearchResults: TaggedTemplateSearchResult[],
  code: string,
  sourceCodeId: string,
  options: TaggedTemplatePostcssOptions
): Promise<ProcessResult> {
  const postcssConfig = await resolvePostcssConfig(options.postcss);
  const tagsToProcess = new Set(options.tags);
  const outputProcessors = options.outputProcessors || [standardOutputProcessor];

  const modifiedCode = new MagicString(code);
  const dependencies: Message[] = [];

  for (const searchResult of taggedTemplateSearchResults) {
    if (tagsToProcess.has(searchResult.tagName)) {
      const postcssOptions = Object.assign({
        from: sourceCodeId,
        to: sourceCodeId
      }, postcssConfig.options);

      const postcssResult = await postcss(postcssConfig.plugins).process(
        code.substring(searchResult.literalContentsStart, searchResult.literalContentsEnd),
        postcssOptions
      );

      modifiedCode.overwrite(
        searchResult.literalContentsStart,
        searchResult.literalContentsEnd,
        pipe.now(postcssResult.css, ...outputProcessors) as string
      );

      // XXX: Add dependencies, but need to clearly mark dir vs. file deps.
      dependencies.push(...postcssResult.messages.filter(isPostcssDependency));
    }
  }

  return [modifiedCode, dependencies];
}

// Get all the dependencies identified by PostCSS. Historically, directory dependencies have been
// marked by some plugins with the 'context-dependency' message type (and in that case, they use
// the file property to signify the path). We're lucky in that Rollup's addWatchFile utility
// function can take paths to both files and directories.
//
// Latest PostCSS plugin message guidance here:
// https://github.com/postcss/postcss/blob/main/docs/guidelines/plugin.md
const validPostcssDependencyTypes = [
  'dependency',
  'context-dependency',
  'dir-dependency'
];

const isPostcssDependency = (message: Message) => validPostcssDependencyTypes.includes(message.type);
