import { simple as simpleWalk } from 'acorn-walk';
import { createFilter } from '@rollup/pluginutils';

import type { TaggedTemplateExpression, TemplateLiteral } from 'estree';
import type { PluginContext, PluginImpl } from 'rollup';

import { buildTransformer  } from 'tagged-template-postcss-core';

import type {
  FindTaggedTemplatesFunc,
  TaggedTemplateSearchResult,
  TaggedTemplatePostcssOptions
} from 'tagged-template-postcss-core';

export interface RollupTaggedTemplatePostcssOptions extends TaggedTemplatePostcssOptions {
  include?: string[];

  exclude?: string[];

  sourceMap?: boolean;
}

const defaultOptions: RollupTaggedTemplatePostcssOptions = {
  tags: ['css']
};

export const taggedTemplatePostcss: PluginImpl<RollupTaggedTemplatePostcssOptions> = (options = defaultOptions) => {
  const filter = createFilter(options.include, options.exclude);

  return {
    name: 'tagged-template-postcss',

    async transform(code, id) {
      if (!filter(id)) {
        return;
      }

      const transformCode = await buildTransformer(buildFindTaggedTemplates(this.parse), options);
      return await transformCode(code, id, {
        generateSourceMap: options.sourceMap
      });
    }
  }
}

function buildFindTaggedTemplates(parse: PluginContext['parse']): FindTaggedTemplatesFunc {
  return (code: string) => {
    const ast = parse(code);
    const searchResults: TaggedTemplateSearchResult[] = [];
    const baseWalker = undefined;

    // Walk the AST and gather the contents of each tagged template literal that will be
    // transformed. Since acorn-walk doesn't support async callbacks, which is needed to invoke
    // PostCSS directly, we just gather location and contents of each targeted tagged template
    // literal during the walk. Transformations are applied once all targets are gathered.
    simpleWalk(ast, {
      TaggedTemplateExpression(node, searchResults: TaggedTemplateSearchResult[]) {
        // Acorn doesn't have great type declarations for its AST nodes. They don't define the
        // specific ESTree node types (whereas @types/estree does), so there isn't an idiomatic
        // TypeScript way (like narrowing on the node's type field) to express the node parameter
        // as ESTree's TaggedTemplateExpression node type other than via a type assertion. This
        // issue seems to be the latest one to talk about basing Acorn's type declarations off the
        // ones in @types/estree: https://github.com/acornjs/acorn/issues/946. Until something
        // better addresses that issue, we'll live with the type assertion for now.
        const taggedTemplateNode = node as unknown as TaggedTemplateExpression;

        // Pull out the tagged template's 'quasi' (its template literal) out as the intersection of
        // both an ESTree TemplateLiteral and an acorn.Node. We do this because we know each node is
        // an Acorn node (which defines the start/end properties for demarking character positions
        // in the parsed source code), and a tagged template's quasi is a TemplateLiteral node:
        // https://github.com/estree/estree/blob/master/es2015.md#taggedtemplateexpression.
        const quasiNode = taggedTemplateNode.quasi as (TemplateLiteral & acorn.Node);

        // Right now only support tagged templates whose tags are simply identifiers. Might consider
        // supporting a few other tag expression types that can be statically analyzed, like a
        // MemberExpression whose computed property is false (to support things like obj.tagFunc):
        // https://github.com/estree/estree/blob/master/es5.md#memberexpression.
        if (taggedTemplateNode.tag.type === 'Identifier') {
          // NOTE: Offset the quasi's start/end by +/-1 because we don't want to include the
          // backtick characters when we record the indices of the template literal's contents.
          searchResults.push({
            tagName: taggedTemplateNode.tag.name,
            literalContentsStart: quasiNode.start + 1,
            literalContentsEnd: quasiNode.end - 1
          });
        }
      }
    }, baseWalker, searchResults);

    return searchResults;
  };
}
