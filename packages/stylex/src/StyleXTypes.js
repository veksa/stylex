/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

'use strict';

import type { CSSProperties } from './StyleXCSSTypes';

// Using an opaque type to declare ClassNames generated by stylex.
export opaque type StyleXClassNameFor<+_K, +_V>: string = string;
export type StyleXClassNameForValue<+V> = StyleXClassNameFor<mixed, V>;
export type StyleXClassNameForKey<+K> = StyleXClassNameFor<K, mixed>;
export type StyleXClassName = StyleXClassNameFor<mixed, mixed>;

// Type for arbitrarily nested Array.
export type StyleXArray<+T> = T | $ReadOnlyArray<StyleXArray<T>>;

type CSSPropertiesWithExtras = $ReadOnly<{
  ...CSSProperties,
  '::before'?: CSSProperties,
  '::after'?: CSSProperties,
  '::backdrop'?: CSSProperties,
  '::cue'?: CSSProperties,
  '::cue-region'?: CSSProperties,
  '::first-letter'?: CSSProperties,
  '::first-line'?: CSSProperties,
  '::file-selector-button'?: CSSProperties,
  '::grammar-error'?: CSSProperties,
  '::marker'?: CSSProperties,
  '::placeholder'?: CSSProperties,
  '::selection'?: CSSProperties,
  '::spelling-error'?: CSSProperties,
  '::target-text'?: CSSProperties,
  '::-webkit-scrollbar'?: CSSProperties,
  // webkit styles used for Search in Safari
  '::-webkit-search-decoration'?: CSSProperties,
  '::-webkit-search-cancel-button'?: CSSProperties,
  '::-webkit-search-results-button'?: CSSProperties,
  '::-webkit-search-results-decoration'?: CSSProperties,
}>;

export type NestedCSSPropTypes = $ReadOnly<{
  [Key in keyof CSSPropertiesWithExtras]?: StyleXClassNameForKey<Key>,
}>;

export type StyleXSingleStyle = false | ?NestedCSSPropTypes;
export type XStyle<+T = NestedCSSPropTypes> = StyleXArray<
  false | ?$ReadOnly<{ ...T, $$css: true }>,
>;
export type XStyleWithout<+T: { +[string]: mixed }> = XStyle<
  $ReadOnly<$Rest<NestedCSSPropTypes, $Exact<T>>>,
>;

export type Keyframes = $ReadOnly<{ [name: string]: CSSProperties, ... }>;

export type LegacyThemeStyles = $ReadOnly<{
  [constantName: string]: string,
  ...
}>;

type ComplexStyleValueType<+T> =
  T extends StyleXVar<infer U>
    ? U
    : T extends string | number | null
      ? T
      : T extends $ReadOnlyArray<infer U>
        ? U
        : T extends $ReadOnly<{ default: infer A, +[string]: infer B }>
          ? ComplexStyleValueType<A> | ComplexStyleValueType<B>
          : $ReadOnly<T>;

type _MapNamespace<+CSS: { +[string]: mixed }> = $ReadOnly<{
  [Key in keyof CSS]: StyleXClassNameFor<Key, ComplexStyleValueType<CSS[Key]>>,
}>;
export type MapNamespace<+CSS: { +[string]: mixed }> = $ReadOnly<{
  ..._MapNamespace<CSS>,
  $$css: true,
}>;
export type MapNamespaces<+S: { +[string]: mixed }> = $ReadOnly<{
  [Key in keyof S]: S[Key] extends (...args: infer Args) => infer Obj
    ? (...args: Args) => $ReadOnly<[MapNamespace<Obj>, InlineStyles]>
    : MapNamespace<S[Key]>,
}>;
export type Stylex$Create = <S: { +[string]: mixed }>(
  styles: S,
) => MapNamespaces<S>;

export type CompiledStyles = $ReadOnly<{
  $$css: true,
  [key: string]: StyleXClassName,
}>;
export type InlineStyles = $ReadOnly<{
  $$css?: void,
  [key: string]: string,
}>;

type _GenStylePropType<+CSS: { +[string]: mixed }> = $ReadOnly<{
  [Key in keyof CSS]: CSS[Key] extends { +[string]: mixed }
    ? StyleXClassNameFor<Key, $ReadOnly<CSS[Key]>>
    : StyleXClassNameFor<Key, CSS[Key]>,
}>;
type GenStylePropType<+CSS: { +[string]: mixed }> = $ReadOnly<{
  ..._GenStylePropType<CSS>,
  $$css: true,
}>;

// Replace `XStyle` with this.
export type StaticStyles<+CSS: { +[string]: mixed } = CSSPropertiesWithExtras> =
  StyleXArray<false | ?GenStylePropType<$ReadOnly<CSS>>>;

export type StaticStylesWithout<+CSS: { +[string]: mixed }> = StaticStyles<
  $Rest<CSSPropertiesWithExtras, $ReadOnly<CSS>>,
>;

export type StyleXStyles<+CSS: { +[string]: mixed } = CSSPropertiesWithExtras> =
  StyleXArray<
    | ?false
    | GenStylePropType<$ReadOnly<CSS>>
    | $ReadOnly<[GenStylePropType<$ReadOnly<CSS>>, InlineStyles]>,
  >;

export type StyleXStylesWithout<+CSS: { +[string]: mixed }> = StyleXStyles<
  $Rest<CSSPropertiesWithExtras, $ReadOnly<CSS>>,
>;

declare class Var<+T> {
  value: T;
}
// This is the type for the variables object
export opaque type StyleXVar<+Val: mixed> = Var<Val>;

export opaque type VarGroup<
  +Tokens: { +[string]: mixed },
  +_ID: string = string,
>: $ReadOnly<{ [Key in keyof Tokens]: StyleXVar<Tokens[Key]> }> = $ReadOnly<{
  [Key in keyof Tokens]: StyleXVar<Tokens[Key]>,
}>;

export type TokensFromVarGroup<T: VarGroup<{ +[string]: mixed }>> =
  T extends VarGroup<infer Tokens extends { +[string]: mixed }>
    ? Tokens
    : empty;
type IDFromVarGroup<+T: VarGroup<{ +[string]: mixed }>> =
  T extends VarGroup<{ +[string]: mixed }, infer ID> ? ID : empty;

type TTokens = $ReadOnly<{
  [string]:
    | number
    | string
    | $ReadOnly<{ default: number | string, [string]: number | string }>
    | StyleXVar<string | number>,
}>;

type UnwrapVars<T> = T extends StyleXVar<infer U> ? U : T;
export type FlattenTokens<T: TTokens> = {
  +[Key in keyof T]: T[Key] extends { +default: infer X, +[string]: infer Y }
    ? UnwrapVars<X | Y>
    : UnwrapVars<T[Key]>,
};

export type StyleX$DefineVars = <DefaultTokens: TTokens, ID: string = string>(
  tokens: DefaultTokens,
) => VarGroup<FlattenTokens<DefaultTokens>, ID>;

// opaque type ThemeKey<+_VG: VarGroup<{ +[string]: mixed }>>: string = string;
export opaque type Theme<
  +T: VarGroup<{ +[string]: mixed }, string>,
  +_Tag: string = string,
>: $ReadOnly<{
  $$css: true,
  [string]: StyleXClassNameFor<string, IDFromVarGroup<T>>,
}> = $ReadOnly<{
  $$css: true,
  [string]: StyleXClassNameFor<string, IDFromVarGroup<T>>,
}>;

export type OverridesForTokenType<Config: { +[string]: mixed }> = {
  [Key in keyof Config]?:
    | Config[Key]
    | { +default: Config[Key], +[string]: Config[Key] },
};

export type StyleX$CreateTheme = <
  BaseTokens: VarGroup<{ +[string]: mixed }>,
  ID: string = string,
>(
  baseTokens: BaseTokens,
  overrides: OverridesForTokenType<TokensFromVarGroup<BaseTokens>>,
) => Theme<BaseTokens, ID>;
