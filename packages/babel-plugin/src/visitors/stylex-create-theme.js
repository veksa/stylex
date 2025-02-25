/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import * as t from '@babel/types';
import type { NodePath } from '@babel/traverse';
import StateManager from '../utils/state-manager';
import { createTheme as stylexCreateTheme, messages } from '@stylexjs/shared';
import { convertObjectToAST } from '../utils/js-to-ast';
import { evaluate } from '../utils/evaluate-path';
import * as pathUtils from '../babel-path-utils';

/// This function looks for `stylex.createTheme` calls and transforms them.
//. 1. It finds the first two arguments to `stylex.createTheme` and validates those.
/// 2. This handles local constants automatically.
/// 4. It uses the `stylexCreateTheme` from `@stylexjs/shared` to transform the JS
///    object and to get a list of injected styles.
/// 5. It converts the resulting Object back into an AST and replaces the call with it.
/// 6. It also inserts `stylex.inject` calls above the current statement as needed.
export default function transformStyleXCreateTheme(
  callExpressionPath: NodePath<t.CallExpression>,
  state: StateManager,
) {
  const callExpressionNode = callExpressionPath.node;

  if (callExpressionNode.type !== 'CallExpression') {
    return;
  }

  if (
    (callExpressionNode.callee.type === 'Identifier' &&
      state.stylexCreateThemeImport.has(callExpressionNode.callee.name)) ||
    (callExpressionNode.callee.type === 'MemberExpression' &&
      callExpressionNode.callee.object.type === 'Identifier' &&
      callExpressionNode.callee.property.type === 'Identifier' &&
      callExpressionNode.callee.property.name === 'createTheme' &&
      state.stylexImport.has(callExpressionNode.callee.object.name))
  ) {
    validateStyleXCreateTheme(callExpressionPath);

    // We know that parent is a variable declaration
    const variableDeclaratorPath = callExpressionPath.parentPath;
    if (!pathUtils.isVariableDeclarator(variableDeclaratorPath)) {
      return;
    }
    const varNamePath = variableDeclaratorPath.get('id');
    let varName = 'UnknownVar';
    if (varNamePath.isIdentifier()) {
      varName = varNamePath.node.name;
    }
    const fileName = state.fileNameForHashing ?? 'UnknownFile';

    const debugName = `${fileName}__${varName}`;

    const args: $ReadOnlyArray<NodePath<>> =
      callExpressionPath.get('arguments');
    const firstArg = args[0];
    const secondArg = args[1];

    const { confident: confident1, value: variables } = evaluate(
      firstArg,
      state,
    );
    if (!confident1) {
      throw new Error(messages.NON_STATIC_VALUE);
    }

    const { confident: confident2, value: overrides } = evaluate(
      secondArg,
      state,
    );
    if (!confident2) {
      throw new Error(messages.NON_STATIC_VALUE);
    }
    if (typeof overrides !== 'object' || overrides == null) {
      throw new Error(messages.NON_OBJECT_FOR_STYLEX_CALL);
    }

    // Check that first arg has __themeName__ set
    if (
      typeof variables.__themeName__ !== 'string' ||
      variables.__themeName__ === ''
    ) {
      throw new Error(
        'Can only override variables theme created with stylex.defineVars().',
      );
    }

    // eslint-disable-next-line prefer-const
    let [overridesObj, injectedStyles] = stylexCreateTheme(
      variables,
      overrides,
      state.options,
    );

    if (state.isDev) {
      overridesObj = { ...overridesObj, [debugName]: debugName };
    }

    // This should be a transformed variables object
    callExpressionPath.replaceWith(convertObjectToAST(overridesObj));

    const listOfStyles = Object.entries(injectedStyles).map(
      ([key, { priority, ...rest }]) => [key, rest, priority],
    );

    state.registerStyles(listOfStyles, variableDeclaratorPath);
  }
}

// Validates the call of `stylex.createTheme`.
function validateStyleXCreateTheme(
  callExpressionPath: NodePath<t.CallExpression>,
) {
  const variableDeclaratorPath: any = callExpressionPath.parentPath;

  if (
    variableDeclaratorPath == null ||
    variableDeclaratorPath.isExpressionStatement() ||
    !variableDeclaratorPath.isVariableDeclarator() ||
    variableDeclaratorPath.node.id.type !== 'Identifier'
  ) {
    throw new Error(messages.UNBOUND_STYLEX_CALL_VALUE);
  }

  if (callExpressionPath.node.arguments.length !== 2) {
    throw new Error(messages.ILLEGAL_ARGUMENT_LENGTH);
  }
}
