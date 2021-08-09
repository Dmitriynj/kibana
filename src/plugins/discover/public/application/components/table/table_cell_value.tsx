/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import classNames from 'classnames';
import React, { Fragment, useState } from 'react';
import { FieldRecord } from './table';
import { trimAngularSpan } from './table_helper';
import { DocViewTableRowBtnCollapse } from './table_row_btn_collapse';
import { DocViewTableRowIconUnderscore } from './table_row_icon_underscore';

const COLLAPSE_LINE_LENGTH = 350;

type TableFieldValueProps = FieldRecord['value'] &
  Pick<FieldRecord['field'], 'field' | 'fieldKey' | 'fieldMapping'>;

export const TableFieldValue = ({
  formattedField,
  field,
  fieldMapping,
  fieldKey,
}: TableFieldValueProps) => {
  const [fieldOpen, setFieldOpen] = useState(false);

  const value = trimAngularSpan(String(formattedField || ''));
  const isCollapsible = value.length > COLLAPSE_LINE_LENGTH;
  const isCollapsed = isCollapsible && !fieldOpen;
  const displayUnderscoreWarning = !fieldMapping && field?.indexOf('_') === 0;

  const valueClassName = classNames({
    // eslint-disable-next-line @typescript-eslint/naming-convention
    kbnDocViewer__value: true,
    'truncate-by-height': isCollapsible && isCollapsed,
  });

  const onToggleCollapse = () => setFieldOpen((fieldOpenPrev) => !fieldOpenPrev);

  return (
    <Fragment>
      {isCollapsible && (
        <DocViewTableRowBtnCollapse onClick={onToggleCollapse} isCollapsed={isCollapsed} />
      )}
      {displayUnderscoreWarning && <DocViewTableRowIconUnderscore />}
      {!field && <div className={valueClassName}>{fieldKey}:&nbsp;</div>}
      <div
        className={valueClassName}
        data-test-subj={`tableDocViewRow-${fieldKey}-value`}
        /*
         * Justification for dangerouslySetInnerHTML:
         * We just use values encoded by our field formatters
         */
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: value }}
      />
    </Fragment>
  );
};
