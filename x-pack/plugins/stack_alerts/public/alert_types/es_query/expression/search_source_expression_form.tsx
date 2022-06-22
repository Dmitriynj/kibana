/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import deepEqual from 'fast-deep-equal';
import { firstValueFrom } from 'rxjs';
import { Filter } from '@kbn/es-query';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DataView, Query, ISearchSource, getTime } from '@kbn/data-plugin/common';
import { IErrorObject } from '@kbn/triggers-actions-ui-plugin/public';
import { SearchBar, SearchBarProps } from '@kbn/unified-search-plugin/public';
import { mapAndFlattenFilters, SavedQuery, TimeHistory } from '@kbn/data-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { CommonAlertParams, EsQueryAlertParams, SearchType } from '../types';
import { DEFAULT_VALUES } from '../constants';
import { DataViewSelectPopover } from '../../components/data_view_select_popover';
import { useTriggersAndActionsUiDeps } from '../util';
import { RuleCommonExpressions } from '../rule_common_expressions';
import { totalHitsToNumber } from '../test_query_row';
import { hasExpressionValidationErrors } from '../validation';

const HIDDEN_FILTER_PANEL_OPTIONS: SearchBarProps['hiddenFilterPanelOptions'] = [
  'pinFilter',
  'disableFilter',
];

interface LocalState {
  index: DataView;
  filter: Filter[];
  query: Query;
  thresholdComparator: CommonAlertParams['thresholdComparator'];
  threshold: CommonAlertParams['threshold'];
  timeWindowSize: CommonAlertParams['timeWindowSize'];
  timeWindowUnit: CommonAlertParams['timeWindowUnit'];
  size: CommonAlertParams['size'];
}

interface LocalStateAction {
  type: SearchSourceParamsAction['type'] | ('threshold' | 'timeWindowSize' | 'size');
  payload: SearchSourceParamsAction['payload'] | (number[] | number);
}

type LocalStateReducer = (prevState: LocalState, action: LocalStateAction) => LocalState;

interface SearchSourceParamsAction {
  type: 'index' | 'filter' | 'query';
  payload: DataView | Filter[] | Query;
}

interface SearchSourceExpressionFormProps {
  searchSource: ISearchSource;
  ruleParams: EsQueryAlertParams<SearchType.searchSource>;
  errors: IErrorObject;
  initialSavedQuery?: SavedQuery;
  setParam: (paramField: string, paramValue: unknown) => void;
}

const isSearchSourceParam = (action: LocalStateAction): action is SearchSourceParamsAction => {
  return action.type === 'filter' || action.type === 'index' || action.type === 'query';
};

export const SearchSourceExpressionForm = (props: SearchSourceExpressionFormProps) => {
  const { data } = useTriggersAndActionsUiDeps();
  const { searchSource, errors, initialSavedQuery, setParam, ruleParams } = props;
  const [savedQuery, setSavedQuery] = useState<SavedQuery>();

  const timeHistory = useMemo(() => new TimeHistory(new Storage(localStorage)), []);

  useEffect(() => setSavedQuery(initialSavedQuery), [initialSavedQuery]);

  const [ruleConfiguration, dispatch] = useReducer<LocalStateReducer>(
    (currentState, action) => {
      if (isSearchSourceParam(action)) {
        searchSource.setParent(undefined).setField(action.type, action.payload);
        setParam('searchConfiguration', searchSource.getSerializedFields());
      } else {
        setParam(action.type, action.payload);
      }
      return { ...currentState, [action.type]: action.payload };
    },
    {
      index: searchSource.getField('index')!,
      query: searchSource.getField('query')!,
      filter: mapAndFlattenFilters(searchSource.getField('filter') as Filter[]),
      threshold: ruleParams.threshold ?? DEFAULT_VALUES.THRESHOLD,
      thresholdComparator: ruleParams.thresholdComparator ?? DEFAULT_VALUES.THRESHOLD_COMPARATOR,
      timeWindowSize: ruleParams.timeWindowSize,
      timeWindowUnit: ruleParams.timeWindowUnit,
      size: ruleParams.size,
    }
  );
  const { index: dataView, query, filter: filters } = ruleConfiguration;
  const dataViews = useMemo(() => (dataView ? [dataView] : []), [dataView]);

  const onSelectDataView = useCallback(
    (newDataViewId) =>
      data.dataViews
        .get(newDataViewId)
        .then((newDataView) => dispatch({ type: 'index', payload: newDataView })),
    [data.dataViews]
  );

  const onUpdateFilters = useCallback((newFilters) => {
    dispatch({ type: 'filter', payload: mapAndFlattenFilters(newFilters) });
  }, []);

  const onChangeQuery = useCallback(
    ({ query: newQuery }: { query?: Query }) => {
      if (!deepEqual(newQuery, query)) {
        dispatch({ type: 'query', payload: newQuery || { ...query, query: '' } });
      }
    },
    [query]
  );

  // needs to change language mode only
  const onQueryBarSubmit = ({ query: newQuery }: { query?: Query }) => {
    if (newQuery?.language !== query.language) {
      dispatch({ type: 'query', payload: { ...query, language: newQuery?.language } as Query });
    }
  };

  // Saved query
  const onSavedQuery = useCallback((newSavedQuery: SavedQuery) => {
    setSavedQuery(newSavedQuery);
    const newFilters = newSavedQuery.attributes.filters;
    if (newFilters) {
      dispatch({ type: 'filter', payload: newFilters });
    }
  }, []);

  const onClearSavedQuery = () => {
    setSavedQuery(undefined);
    dispatch({ type: 'query', payload: { ...query, query: '' } });
  };

  // window size
  const onChangeWindowUnit = useCallback(
    (selectedWindowUnit: string) => setParam('timeWindowUnit', selectedWindowUnit),
    [setParam]
  );

  const onChangeWindowSize = useCallback(
    (selectedWindowSize?: number) =>
      selectedWindowSize && dispatch({ type: 'timeWindowSize', payload: selectedWindowSize }),
    []
  );

  // threshold
  const onChangeSelectedThresholdComparator = useCallback(
    (selectedThresholdComparator?: string) =>
      setParam('thresholdComparator', selectedThresholdComparator),
    [setParam]
  );

  const onChangeSelectedThreshold = useCallback(
    (selectedThresholds?: number[]) =>
      selectedThresholds && dispatch({ type: 'threshold', payload: selectedThresholds }),
    []
  );

  const onChangeSizeValue = useCallback(
    (updatedValue: number) => dispatch({ type: 'size', payload: updatedValue }),
    []
  );
  const onTestFetch = useCallback(async () => {
    const timeWindow = `${ruleConfiguration.timeWindowSize}${ruleConfiguration.timeWindowUnit}`;
    const testSearchSource = searchSource.createCopy();
    const timeFilter = getTime(searchSource.getField('index')!, {
      from: `now-${timeWindow}`,
      to: 'now',
    });
    testSearchSource.setField(
      'filter',
      timeFilter ? [timeFilter, ...ruleConfiguration.filter] : ruleConfiguration.filter
    );
    const { rawResponse } = await firstValueFrom(testSearchSource.fetch$());
    return { nrOfDocs: totalHitsToNumber(rawResponse.hits.total), timeWindow };
  }, [searchSource, ruleConfiguration]);

  return (
    <Fragment>
      <EuiTitle size="xs">
        <h5>
          <FormattedMessage
            id="xpack.stackAlerts.searchThreshold.ui.conditionPrompt"
            defaultMessage="When the number of documents match"
          />
        </h5>
      </EuiTitle>

      <EuiSpacer size="s" />

      <DataViewSelectPopover
        initialDataViewTitle={dataView?.title}
        initialDataViewId={dataView?.id}
        onSelectDataView={onSelectDataView}
      />

      <EuiSpacer size="s" />

      <SearchBar
        onQuerySubmit={onQueryBarSubmit}
        onQueryChange={onChangeQuery}
        suggestionsSize="s"
        displayStyle="inPage"
        placeholder={i18n.translate('xpack.stackAlerts.searchSource.ui.searchQuery', {
          defaultMessage: 'Search query',
        })}
        query={query}
        indexPatterns={dataViews}
        savedQuery={savedQuery}
        filters={filters}
        onFiltersUpdated={onUpdateFilters}
        onClearSavedQuery={onClearSavedQuery}
        onSavedQueryUpdated={onSavedQuery}
        onSaved={onSavedQuery}
        showSaveQuery
        showQueryBar
        showQueryInput
        showFilterBar
        showDatePicker={false}
        showAutoRefreshOnly={false}
        showSubmitButton={false}
        dateRangeFrom={undefined}
        dateRangeTo={undefined}
        timeHistory={timeHistory}
        hiddenFilterPanelOptions={HIDDEN_FILTER_PANEL_OPTIONS}
      />

      <EuiSpacer />

      <RuleCommonExpressions
        threshold={ruleConfiguration.threshold}
        thresholdComparator={ruleConfiguration.thresholdComparator}
        timeWindowSize={ruleConfiguration.timeWindowSize}
        timeWindowUnit={ruleConfiguration.timeWindowUnit}
        size={ruleConfiguration.size}
        onChangeThreshold={onChangeSelectedThreshold}
        onChangeThresholdComparator={onChangeSelectedThresholdComparator}
        onChangeWindowSize={onChangeWindowSize}
        onChangeWindowUnit={onChangeWindowUnit}
        onChangeSizeValue={onChangeSizeValue}
        errors={errors}
        hasValidationErrors={hasExpressionValidationErrors(ruleParams) || !ruleConfiguration.index}
        onTestFetch={onTestFetch}
      />

      <EuiSpacer />
    </Fragment>
  );
};
