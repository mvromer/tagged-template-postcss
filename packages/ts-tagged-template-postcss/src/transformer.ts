import * as ts from 'typescript';

import type { TaggedTemplatePostcssOptions, TaggedTemplateSearchResult } from 'tagged-template-postcss-core';

export const tsTaggedTemplatePostcss = (options: TaggedTemplatePostcssOptions) => {
  return (context: ts.TransformationContext) => {
    return async (sourceFile: ts.SourceFile) => {
      const searchResults: TaggedTemplateSearchResult[] = [];

      const visitor = (node: ts.Node): ts.Node => {
        if (ts.isTaggedTemplateExpression(node)) {
          // Right now only support tagged templates whose tags are simply identifiers. Might
          // consider supporting a few other tag expression types that can be statically analyzed,
          // like a MemberExpression
          if (ts.isIdentifier(node.tag)) {
            // NOTE: Offset the node's template expression pos/end by +/-1 because we don't want to
            // include the backtick characters when we record the indices of the template literal's
            // contents.
            searchResults.push({
              tagName: node.tag.text,
              literalContentsStart: node.template.pos + 1,
              literalContentsEnd: node.template.end - 1
            })
          }
        }
        return ts.visitEachChild(node, visitor, context);
      }

      const r = ts.visitNode(sourceFile, visitor);
      if (searchResults.length === 0) {
        return sourceFile;
      }

      const transformCode = 
      const code = sourceFile.text;
      return 
    }
  }
};

const tsTaggedTemplatePostcss2: ts.TransformerFactory<ts.SourceFile> = context => {
  return sourceFile => {
    const visitor = (node: ts.Node): ts.Node => {
      if (ts.isTaggedTemplateExpression(node)) {
        if (ts.isIdentifier(node.tag)) {
          if (node.tag.text === 'html') {
            console.log('Found html tagged template');
            return context.factory.updateTaggedTemplateExpression(
              node,
              node.tag,
              node.typeArguments,
              context.factory.createNoSubstitutionTemplateLiteral(
                'THIS IS JUST SOME FILLER TEXT'
              )
            );
          }
        }
      }

      return ts.visitEachChild(node, visitor, context);
    }

    // Idea:
    // 1. Run visitor to get all tagged template expressions. Capture the search results variable.
    // 2. Build the transformer
    // 3. Get the source text from sourceFile
    // 4. Process source code with transformer
    // 5. Use/REturn sourceFile.update() with new source code.

    const newContent = `const x = 'big butts';`
    return sourceFile.update(newContent, {
      span: {
        start: 0,
        length: sourceFile.text.length
      },
      newLength: newContent.length
    });

    // return ts.visitNode(sourceFile, visitor);
  }
}
