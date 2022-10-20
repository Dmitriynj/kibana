/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SerializableRecord } from '@kbn/utility-types';
import type { Filter } from '@kbn/es-query';
import type { GlobalQueryStateFromUrl } from '@kbn/data-plugin/public';
import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/public';
import { setStateToKbnUrl } from '@kbn/kibana-utils-plugin/public';
import { DataViewSpec } from '@kbn/data-views-plugin/public';
import type { DiscoverMainStateParams } from '../../../hooks/use_root_breadcrumb';

export const DISCOVER_CONTEXT_APP_LOCATOR = 'DISCOVER_CONTEXT_APP_LOCATOR';

export interface DiscoverContextAppLocatorParams
  extends DiscoverMainStateParams,
    SerializableRecord {
  /**
   * String id for saved dataViews and spec for adhoc data views
   */
  index: string | DataViewSpec;
  rowId: string;
}

export type DiscoverContextAppLocator = LocatorPublic<DiscoverContextAppLocatorParams>;

export interface DiscoverContextAppLocatorDependencies {
  useHash: boolean;
}

export class DiscoverContextAppLocatorDefinition
  implements LocatorDefinition<DiscoverContextAppLocatorParams>
{
  public readonly id = DISCOVER_CONTEXT_APP_LOCATOR;

  constructor(protected readonly deps: DiscoverContextAppLocatorDependencies) {}

  public readonly getLocation = async (params: DiscoverContextAppLocatorParams) => {
    const useHash = this.deps.useHash;
    const { index, rowId, columns, filters, timeRange, query, savedSearchId } = params;

    const appState: { filters?: Filter[]; columns?: string[] } = {};
    const queryState: GlobalQueryStateFromUrl = {};

    const { isFilterPinned } = await import('@kbn/es-query');
    if (filters && filters.length) appState.filters = filters?.filter((f) => !isFilterPinned(f));
    if (columns) appState.columns = columns;

    if (filters && filters.length) queryState.filters = filters?.filter((f) => isFilterPinned(f));

    const state: DiscoverMainStateParams = {
      index,
      timeRange,
      query,
      filters,
      columns,
      savedSearchId,
    };

    let dataViewId;
    if (typeof index === 'string') {
      dataViewId = index;
    } else {
      dataViewId = index.id;
    }

    let path = `#/context/${dataViewId}/${rowId}`;
    path = setStateToKbnUrl<GlobalQueryStateFromUrl>('_g', queryState, { useHash }, path);
    path = setStateToKbnUrl('_a', appState, { useHash }, path);

    return {
      app: 'discover',
      path,
      state,
    };
  };
}
