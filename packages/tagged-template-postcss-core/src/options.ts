import type { AcceptedPlugin, ProcessOptions } from 'postcss';

import type { OutputProcessor } from './output-processor';

export interface TaggedTemplatePostcssOptions {
  /**
   * List of tagged template literal names whose contents will be transformed using PostCSS.
   */
  tags: string[];

  /**
   * Optional PostCSS config used to transform the contents of the tagged template literals
   * specified by `tags`. This mirrors (more or less) what you'd put in a postcss.config.js file.
   * The `to`, `from`, and `map` PostCSS options will be ignored.
   *
   * If not given, then [postcss-load-config](https://github.com/postcss/postcss-load-config#readme)
   * will be used to load a PostCSS config from one of its supported locations.
   */
  postcss?: Pick<ProcessOptions, "parser" | "stringifier" | "syntax"> & {
    plugins?: AcceptedPlugin[];
  }

  /**
   * Optional output processors to apply to the tagged template literal's contents AFTER they have
   * been processed by PostCSS. Transform functions are applied in the order in which they are
   * specified.
   *
   * If this is not given, a standard output processor is applied that 1) escapes each backslash,
   * 2) escapes each backtick, and 3) escapes each dollar sign followed by an open curly brace,
   * which is inferred to be the start of a template literal placeholder.
   *
   * If you want to apply no output processors, then set this to an empty array.
   */
  outputProcessors?: OutputProcessor[];
}
