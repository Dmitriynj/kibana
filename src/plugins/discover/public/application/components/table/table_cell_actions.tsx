/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { DocViewTableRowBtnFilterRemove } from './table_row_btn_filter_remove';
import { DocViewTableRowBtnFilterExists } from './table_row_btn_filter_exists';
import { DocViewTableRowBtnToggleColumn } from './table_row_btn_toggle_column';
import { DocViewTableRowBtnFilterAdd } from './table_row_btn_filter_add';
import { IndexPatternField } from '../../../../../data/public';
import { DocViewFilterFn } from '../../doc_views/doc_views_types';

interface TableActionsProps {
  fieldKey: string;
  field?: string;
  isActive: boolean;
  flattenedField: unknown;
  fieldMapping?: IndexPatternField;
  onFilter: DocViewFilterFn;
  onToggleColumn: () => void;
}

export const TableActions = ({
  fieldKey,
  isActive,
  field,
  fieldMapping,
  flattenedField,
  onToggleColumn,
  onFilter,
}: TableActionsProps) => {
  return (
    <div className="kbnDocViewer__buttons">
      <DocViewTableRowBtnFilterAdd
        disabled={!fieldMapping || !fieldMapping.filterable}
        onClick={() => onFilter(fieldMapping, flattenedField, '+')}
      />
      <DocViewTableRowBtnFilterRemove
        disabled={!fieldMapping || !fieldMapping.filterable}
        onClick={() => onFilter(fieldMapping, flattenedField, '-')}
      />
      <DocViewTableRowBtnToggleColumn
        active={isActive}
        fieldname={String(fieldKey)}
        onClick={onToggleColumn}
      />
      <DocViewTableRowBtnFilterExists
        disabled={!fieldMapping || !fieldMapping.filterable}
        onClick={() => onFilter('_exists_', field, '+')}
        scripted={fieldMapping && fieldMapping.scripted}
      />
    </div>
  );
};
