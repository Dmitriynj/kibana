/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import { buildEmptyFilter, Filter } from '@kbn/es-query';
import { Operator } from '../../filter_bar/filter_editor/lib/filter_operators';
import { ConditionTypes } from './filters_editor_condition_types';

const PATH_SEPARATOR = '.';

/** to: @kbn/es-query **/
const buildConditionalFilter = (conditionalType: 'or' | 'and', filters: Filter[]) => {
  const filter = buildEmptyFilter(false);

  return {
    ...filter,
    meta: {
      ...filter.meta,
      params: {
        ...filter.meta.params,
        conditionalType,
        filters,
      },
    },
  };
};

/** to: @kbn/es-query **/
export const isOrFilter = (filter: Filter) => Boolean(filter.meta?.params.filters);

export const getConditionalOperationType = (filter: Filter | Filter[]) => {
  if (Array.isArray(filter)) {
    return ConditionTypes.AND;
  } else if (isOrFilter(filter)) {
    return ConditionTypes.OR;
  }
};

export const getPathInArray = (path: string) => path.split(PATH_SEPARATOR).map((i) => +i);

const doForFilterByPath = <T>(filters: Filter[], path: string, action: (filter: Filter) => T) => {
  const pathArray = getPathInArray(path);
  let f: Filter = filters[pathArray[0]];
  for (let i = 1, depth = pathArray.length; i < depth; i++) {
    f = f?.meta?.params?.filters?.[+pathArray[i]] ?? f;
  }
  return action(f);
};

const getContainerMetaByPath = (filters: Filter[], pathInArray: number[]) => {
  let targetArray: Filter[] = filters;
  let parentFilter: Filter | undefined;
  let parentConditionType = ConditionTypes.AND;

  if (pathInArray.length > 1) {
    parentFilter = getFilterByPath(filters, getParentFilterPath(pathInArray));
    parentConditionType = getConditionalOperationType(parentFilter) ?? parentConditionType;
    targetArray = parentFilter.meta.params.filters;
  }

  return {
    parentFilter,
    targetArray,
    parentConditionType,
  };
};

const getParentFilterPath = (pathInArray: number[]) =>
  pathInArray.slice(0, -1).join(PATH_SEPARATOR);

const normalizeFilters = (filters: Filter[]): Filter[] =>
  filters
    .map((filter: Filter) => {
      if (getConditionalOperationType(filter)) {
        const f = normalizeFilters(filter.meta.params.filters);
        if (f) {
          if (f.length === 1) {
            return f[0];
          }
          if (f.length === 0) {
            return undefined;
          }
        }
        return {
          ...filter,
          meta: {
            ...filter.meta,
            params: {
              ...filter.meta.params,
              filters: f,
            },
          },
        };
      }
      return filter;
    })
    .filter(Boolean) as Filter[];

export const getFilterByPath = (filters: Filter[], path: string): Filter =>
  doForFilterByPath(filters, path, (f) => f);

export const addFilter = (
  filters: Filter[],
  filter: Filter,
  path: string,
  conditionalType: ConditionTypes
) => {
  const newFilters = [...filters];
  const pathInArray = getPathInArray(path);
  const { targetArray, parentConditionType } = getContainerMetaByPath(newFilters, pathInArray);

  const selector = pathInArray[pathInArray.length - 1];

  if (parentConditionType !== conditionalType) {
    targetArray.splice(
      selector,
      1,
      buildConditionalFilter(conditionalType === ConditionTypes.AND ? 'and' : 'or', [
        targetArray[selector],
        filter,
      ])
    );
  } else {
    targetArray.splice(selector + 1, 0, filter);
  }

  return newFilters;
};

export const removeFilter = (filters: Filter[], path: string) => {
  const newFilters = [...filters];
  const pathInArray = getPathInArray(path);
  const { targetArray } = getContainerMetaByPath(newFilters, pathInArray);
  const selector = pathInArray[pathInArray.length - 1];

  targetArray.splice(selector, 1);

  return normalizeFilters(newFilters);
};

export const updateFilter = (
  filters: Filter[],
  path: string,
  dataView: DataView,
  field?: DataViewField,
  operator?: Operator,
  params?: Filter['meta']['params'],
  filter?: Filter
) => {
  return [...filters];
};

export const moveFilter = (
  filters: Filter[],
  from: string,
  to: string,
  conditionalType: ConditionTypes
) => {
  const newFilters = [...filters];
  const movingFilter = getFilterByPath(newFilters, from);

  let resultFilters = newFilters;

  if (getPathInArray(to).length > 1) {
    const newFilterWithFilter = addFilter(resultFilters, movingFilter, to, conditionalType);
    resultFilters = removeFilter(newFilterWithFilter, from);
  } else {
    const newFiltersWithoutFilter = removeFilter(resultFilters, from);
    resultFilters = addFilter(newFiltersWithoutFilter, movingFilter, to, conditionalType);
  }

  return resultFilters;
};
