import React, { useMemo } from 'react';
import { resolveColorway } from '../../theme/registry';
import { roleVars, bridgeVars } from '../../theme/cssVars';
import { FONT_STACK } from '../../theme/registry';

/**
 * ThemeScope — renders its children under a DIFFERENT colorway than the OS.
 *
 * This is the linchpin of the whole showcase. Because every component already reads CSS variables
 * rather than JS colour values, scoping a role set to a subtree is enough to render sixteen
 * colorways side by side on one screen without touching the user's actual theme.
 *
 * It also sets data-mode / data-grammar locally, so grammar.css's [data-mode] rules resolve INSIDE
 * the scope. That is what makes a Hearth card behave paper-flat while the surrounding OS is still
 * lifted and dark — the cheapest possible demonstration that "grammar" is a real thing and not just
 * a palette swap.
 */
const ThemeScope = ({ colorway, as: Tag = 'div', className = '', style, children, ...rest }) => {
  const cw = useMemo(() => resolveColorway(colorway), [colorway]);

  const vars = useMemo(() => {
    const v = { ...roleVars(cw), ...bridgeVars(cw) };
    v['--sdl-font-title'] = FONT_STACK(cw.titleFace);
    return v;
  }, [cw]);

  return (
    <Tag
      data-mode={cw.mode}
      data-grammar={cw.grammar}
      data-colorway={cw.id}
      className={className}
      style={{ ...vars, ...style }}
      {...rest}
    >
      {children}
    </Tag>
  );
};

export default ThemeScope;
