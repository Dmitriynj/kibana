/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiDataGridStyle } from '@elastic/eui';

// data types
export const kibanaJSON = 'kibana-json';
export const GRID_STYLE = {
  border: 'all',
  rowHover: 'none',
  fontSize: 's',
  cellPadding: 's',
} as EuiDataGridStyle;
export const DENSITY_STYLES: { [key: string]: Partial<EuiDataGridStyle> } = {
  expanded: {
    fontSize: 'l',
    cellPadding: 'l',
  },
  normal: {
    fontSize: 'm',
    cellPadding: 'm',
  },
  compact: {
    fontSize: 's',
    cellPadding: 's',
  },
};

export const pageSizeArr = [25, 50, 100, 250];
export const defaultPageSize = 100;
export const defaultTimeColumnWidth = 190;
export const toolbarVisibility = {
  showColumnSelector: {
    allowHide: false,
    allowReorder: true,
  },
};

export const defaultMonacoEditorWidth = 370;
