import React from 'react';
import { Item } from 'react-contexify';
import CustomIcon from './CustomIcon';

/**
 * One row of a right-click menu.
 *
 * Every row used to inline its own `<CustomIcon size={13} className="mr-2" />`, and Open Terminal
 * used a `>_` text glyph instead — so the icons set two different label origins and the column read
 * as ragged. Routing them through one component means the icon slot is defined once; the fixed
 * 16px column that aligns it lives in the `.os-context-menu` block in index.css.
 *
 * `danger` tags the destructive rows so they can carry the alert role, the same way the Reset
 * button in the Appearance pane does.
 */
const MenuRow = ({ icon, label, onClick, danger = false }) => (
  <Item onClick={onClick} className={danger ? 'os-menu-danger' : undefined}>
    <CustomIcon icon={icon} size={14} color="currentColor" animate={false} />
    <span>{label}</span>
  </Item>
);

export default MenuRow;
