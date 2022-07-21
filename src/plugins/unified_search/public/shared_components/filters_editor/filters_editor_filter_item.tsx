/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { Filter } from '@kbn/es-query';

export interface FilterItemProps {
  filter: Filter;
}

export function FilterItem({ filter }: FilterItemProps) {
  return (
    <>
      <EuiFlexGroup gutterSize="none" responsive={false}>
        <EuiFlexItem>{JSON.stringify(filter)}</EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}
