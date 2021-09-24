import { pick } from 'lodash-es';
import postcssrc from "postcss-load-config";
import TraceError from 'trace-error';

import type { Config as PostcssConfig } from 'postcss-load-config';

import { standardOutputTransform } from './transforms.js';

import type { TaggedTemplatePostcssOptions } from './options.js';
import type { TransformFunc } from './transforms.js';

interface ResolvedPostcssConfig {
  /**
   * PostCSS options to use.
   */
  options: Pick<PostcssConfig, 'parser' | 'stringifier' | 'syntax'>;

  /**
   * PostCSS plugins to use.
   */
  plugins: PostcssConfig['plugins'];
}

interface ProcessTagConfig {
  /**
   * Resolved PostCSS config used to transform the template literal contents.
   */
  postcssConfig: ResolvedPostcssConfig;

  /**
   * Transform functions applied to the template literal contents after they have been transformed
   * by PostCSS.
   */
  outputTransforms: TransformFunc[];
}

export async function makeTagMap(pluginOptions: TaggedTemplatePostcssOptions | TaggedTemplatePostcssOptions[]) {
  if (!Array.isArray(pluginOptions)) {
    pluginOptions = [pluginOptions];
  }

  const tagMap = new Map<string, ProcessTagConfig>();

  for (const optionsObj of pluginOptions) {
    let postcssConfig;

    try {
      postcssConfig = await resolvePostcssConfig(optionsObj.postcss);
    }
    catch (e) {
      const wrappedError = e instanceof Error ? e : new Error(`${e}`);
      throw new TraceError(`PostCSS config missing for tag set ${optionsObj.tags}`, wrappedError);
    }

    const processTagConfig: ProcessTagConfig = {
      postcssConfig,
      outputTransforms: optionsObj.outputTransforms || [standardOutputTransform]
    };

    // Map the tag config for each tagged template literal name given in the current options.
    for (const tag of optionsObj.tags) {
      if (tagMap.has(tag)) {
        throw new Error(`PostCSS config already defined for tagged template literal ${tag}`);
      }

      tagMap.set(tag, processTagConfig);
    }
  }

  return tagMap;
}

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
async function resolvePostcssConfig(postcssConfig: TaggedTemplatePostcssOptions['postcss']): Promise<ResolvedPostcssConfig> {
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

  const loadResult = await postcssrc();
  return {
    plugins: loadResult.plugins,
    options: pick(loadResult.options, acceptedOptions)
  };
}
