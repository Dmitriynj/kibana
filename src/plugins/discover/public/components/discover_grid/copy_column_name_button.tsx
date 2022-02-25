/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { copyToClipboard, EuiListGroupItemProps } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export function buildCopyColumnNameButton(columnName: string) {
  let copy: () => void;
  const copyToClipBoardButton: EuiListGroupItemProps = {
    size: 'xs',
    label: (
      <EuiCopy textToCopy={columnName}>
        {(copyCallback) => (
          <FormattedMessage
            ref={() => (copy = copyCallback)}
            id="discover.grid.copyToClipBoardButton"
            defaultMessage="Copy to clipboard"
          />
        )}
      </EuiCopy>
    ),
    iconType: 'copyClipboard',
    iconProps: { size: 'm' },
    onClick: () => copy(),
  };

  return copyToClipBoardButton;
}
