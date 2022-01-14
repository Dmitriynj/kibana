/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { EuiDataGridRowHeightOption, EuiDataGridRowHeightsOptions } from '@elastic/eui';
import { useMemo } from 'react';
import { IUiSettingsClient } from 'kibana/public';
import { Storage } from '../../../kibana_utils/public';
import { ROW_HEIGHT_OPTION } from '../../common';
import { getDefaultRowHeight, updateStoredRowHeight } from './row_heights';

interface UseRowHeightProps {
  rowHeightState?: number;
  onUpdateRowHeight?: (rowHeight: number) => void;
  storage: Storage;
  uiSettings: IUiSettingsClient;
}

const SINGLE_ROW_HEIGHT_OPTION = 0;
const AUTO_ROW_HEIGHT_OPTION = -1;

const serializeRowHeight = (rowHeight?: EuiDataGridRowHeightOption): number => {
  if (rowHeight === 'auto') {
    return AUTO_ROW_HEIGHT_OPTION;
  } else if (typeof rowHeight === 'object' && rowHeight.lineCount) {
    return rowHeight.lineCount; // custom
  }

  return SINGLE_ROW_HEIGHT_OPTION;
};
const deserializeRowHeight = (number: number): EuiDataGridRowHeightOption | undefined => {
  if (number === AUTO_ROW_HEIGHT_OPTION) {
    return 'auto';
  } else if (number === SINGLE_ROW_HEIGHT_OPTION) {
    return undefined;
  }

  return { lineCount: number }; // custom
};

export const useRowHeightsOptions = ({
  rowHeightState,
  onUpdateRowHeight,
  storage,
  uiSettings,
}: UseRowHeightProps) =>
  useMemo(
    (): EuiDataGridRowHeightsOptions => ({
      defaultHeight: deserializeRowHeight(
        typeof rowHeightState === 'number'
          ? rowHeightState
          : getDefaultRowHeight(uiSettings, storage)
      ),
      onChange: ({ defaultHeight: newRowHeight }: EuiDataGridRowHeightsOptions) => {
        const newSerializedRowHeight = serializeRowHeight(newRowHeight);
        updateStoredRowHeight(newSerializedRowHeight, uiSettings.get(ROW_HEIGHT_OPTION), storage);
        onUpdateRowHeight?.(newSerializedRowHeight);
      },
    }),
    [rowHeightState, uiSettings, storage, onUpdateRowHeight]
  );
