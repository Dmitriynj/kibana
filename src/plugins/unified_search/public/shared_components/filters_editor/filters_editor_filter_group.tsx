/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useContext } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiText, EuiPanel } from '@elastic/eui';
import type { Filter } from '@kbn/es-query';
import type { Path } from './filter_editors_types';
import { ConditionTypes } from './filters_editor_condition_types';
import { FilterItem } from './filters_editor_filter_item';
import { FiltersEditorContextType } from './filters_editor_context';
import { getPathInArray } from './filters_editor_utils';

export interface FilterGroupProps {
  filters: Filter[];
  conditionType: ConditionTypes;
  path: Path;
  timeRangeForSuggestionsOverride?: boolean;
  reverseBackground?: boolean;
}

const Delimiter = ({ conditionType }: { conditionType: ConditionTypes }) =>
  conditionType === ConditionTypes.OR ? (
    <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
      <EuiFlexItem grow={1}>
        <EuiHorizontalRule margin="s" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s" color="subdued">
          {i18n.translate('unifiedSearch.filter.filtersEditor.orDelimiterLabel', {
            defaultMessage: 'OR',
          })}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={10}>
        <EuiHorizontalRule margin="s" />
      </EuiFlexItem>{' '}
    </EuiFlexGroup>
  ) : null;

export const FilterGroup = ({
  filters,
  conditionType,
  path,
  timeRangeForSuggestionsOverride,
  reverseBackground = false,
}: FilterGroupProps) => {
  const {
    globalParams: { maxDepth, disableOr, disableAnd },
  } = useContext(FiltersEditorContextType);

  const pathInArray = getPathInArray(path);

  const isDepthReached = maxDepth === pathInArray.length;
  const orDisabled = disableOr || (isDepthReached && conditionType === ConditionTypes.AND);
  const andDisabled = disableAnd || (isDepthReached && conditionType === ConditionTypes.OR);
  const removeDisabled = pathInArray.length <= 1 && filters.length === 1;
  const color = !reverseBackground ? 'plain' : 'subdued';

  return (
    <EuiPanel color={color} paddingSize="s" hasShadow={false}>
      {filters.map((filter, index, acc) => (
        <>
          <EuiFlexGroup direction="column" gutterSize="xs">
            <EuiFlexItem>
              <FilterItem
                filter={filter}
                path={`${path}${path ? '.' : ''}${index}`}
                timeRangeForSuggestionsOverride={timeRangeForSuggestionsOverride}
                reverseBackground={reverseBackground}
                disableOr={orDisabled}
                disableAnd={andDisabled}
                disableRemove={removeDisabled}
                color={color}
                index={index}
              />
            </EuiFlexItem>

            {index + 1 < acc.length ? (
              <EuiFlexItem>
                <Delimiter conditionType={conditionType} />
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </>
      ))}
    </EuiPanel>
  );
};
