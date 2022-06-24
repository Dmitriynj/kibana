/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mountWithIntl } from '@kbn/test-jest-helpers';
import 'brace';
import React from 'react';
import { docLinksServiceMock } from '@kbn/core/public/mocks';
import { httpServiceMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { unifiedSearchPluginMock } from '@kbn/unified-search-plugin/public/mocks';
import { EsQueryAlertParams, SearchType } from '../types';
import { EsQueryAlertTypeExpression } from './expression';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { Subject } from 'rxjs';
import { ISearchSource } from '@kbn/data-plugin/common';
import { IUiSettingsClient } from '@kbn/core/public';
import { findTestSubject } from '@elastic/eui/lib/test';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { act } from 'react-dom/test-utils';
import { ReactWrapper } from 'enzyme';

const defaultEsQueryRuleParams: EsQueryAlertParams<SearchType.esQuery> = {
  size: 100,
  thresholdComparator: '>',
  threshold: [0],
  timeWindowSize: 15,
  timeWindowUnit: 's',
  index: ['test-index'],
  timeField: '@timestamp',
  esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
};
const defaultSearchSourceRuleParams: EsQueryAlertParams<SearchType.searchSource> = {
  size: 100,
  thresholdComparator: '>',
  threshold: [0],
  timeWindowSize: 15,
  timeWindowUnit: 's',
  index: ['test-index'],
  timeField: '@timestamp',
  searchType: SearchType.searchSource,
  searchConfiguration: {},
};

const dataViewPluginMock = dataViewPluginMocks.createStartContract();
const chartsStartMock = chartPluginMock.createStartContract();
const unifiedSearchMock = unifiedSearchPluginMock.createStartContract();
const httpMock = httpServiceMock.createStartContract();
const docLinksMock = docLinksServiceMock.createStartContract();
export const uiSettingsMock = {
  get: jest.fn(),
} as unknown as IUiSettingsClient;

const mockSearchResult = new Subject();
const searchSourceFieldsMock = {
  query: {
    query: '',
    language: 'kuery',
  },
  filter: [],
  index: {
    id: '90943e30-9a47-11e8-b64d-95841ca0b247',
    title: 'kibana_sample_data_logs',
    fields: [],
  },
};

const searchSourceMock = {
  id: 'data_source6',
  fields: searchSourceFieldsMock,
  getField: (name: string) => {
    return (searchSourceFieldsMock as Record<string, object>)[name] || '';
  },
  setField: jest.fn(),
  createCopy: jest.fn(() => {
    return searchSourceMock;
  }),
  setParent: jest.fn(() => {
    return searchSourceMock;
  }),
  fetch$: jest.fn(() => {
    return mockSearchResult;
  }),
} as unknown as ISearchSource;

const savedQueryMock = {
  id: 'test-id',
  attributes: {
    title: 'test-filter-set',
    description: '',
    query: {
      query: 'category.keyword : "Men\'s Shoes" ',
      language: 'kuery',
    },
    filters: [],
  },
};

const dataMock = dataPluginMock.createStartContract();
(dataMock.search.searchSource.create as jest.Mock).mockImplementation(() =>
  Promise.resolve(searchSourceMock)
);
(dataMock.dataViews.getIdsWithTitle as jest.Mock).mockImplementation(() => Promise.resolve([]));
dataMock.dataViews.getDefaultDataView = jest.fn(() => Promise.resolve(null));
(dataMock.query.savedQueries.getSavedQuery as jest.Mock).mockImplementation(() =>
  Promise.resolve(savedQueryMock)
);
dataMock.query.savedQueries.findSavedQueries = jest.fn(() =>
  Promise.resolve({ total: 0, queries: [] })
);
(httpMock.post as jest.Mock).mockImplementation(() => Promise.resolve({ fields: [] }));

const setup = (
  ruleParams: EsQueryAlertParams<SearchType.searchSource> | EsQueryAlertParams<SearchType.esQuery>
) => {
  const errors = {
    index: [],
    esQuery: [],
    size: [],
    timeField: [],
    timeWindowSize: [],
    searchConfiguration: [],
  };

  return mountWithIntl(
    <KibanaContextProvider
      services={{
        data: dataMock,
        uiSettings: uiSettingsMock,
        docLinks: docLinksMock,
        http: httpMock,
      }}
    >
      <EsQueryAlertTypeExpression
        ruleInterval="1m"
        ruleThrottle="1m"
        alertNotifyWhen="onThrottleInterval"
        ruleParams={ruleParams}
        setRuleParams={jest.fn()}
        setRuleProperty={jest.fn()}
        errors={errors}
        unifiedSearch={unifiedSearchMock}
        data={dataMock}
        dataViews={dataViewPluginMock}
        defaultActionGroupId=""
        actionGroups={[]}
        charts={chartsStartMock}
      />
    </KibanaContextProvider>
  );
};

describe('EsQueryAlertTypeExpression', () => {
  test('should render options by default', async () => {
    const wrapper = setup({} as EsQueryAlertParams<SearchType.esQuery>);
    expect(findTestSubject(wrapper, 'queryFormTypeChooserTitle').exists()).toBeTruthy();
    expect(findTestSubject(wrapper, 'queryFormType_kql_or_lucene').exists()).toBeTruthy();
    expect(findTestSubject(wrapper, 'queryFormType_query_dsl').exists()).toBeTruthy();
    expect(findTestSubject(wrapper, 'queryFormTypeChooserCancel').exists()).toBeFalsy();
  });

  test('should switch to QueryDSL form type on selection and return back on cancel', async () => {
    let wrapper = setup({} as EsQueryAlertParams<SearchType.esQuery>);
    await act(async () => {
      findTestSubject(wrapper, 'queryFormType_query_dsl').simulate('click');
    });
    wrapper = await wrapper.update();

    expect(findTestSubject(wrapper, 'queryFormTypeChooserTitle').exists()).toBeFalsy();
    expect(findTestSubject(wrapper, 'queryJsonEditor').exists()).toBeTruthy();
    expect(findTestSubject(wrapper, 'selectIndexExpression').exists()).toBeTruthy();

    await act(async () => {
      findTestSubject(wrapper, 'queryFormTypeChooserCancel').simulate('click');
    });
    wrapper = await wrapper.update();
    expect(findTestSubject(wrapper, 'selectIndexExpression').exists()).toBeFalsy();
    expect(findTestSubject(wrapper, 'queryFormTypeChooserTitle').exists()).toBeTruthy();
  });

  test('should switch to KQL or Lucene form type on selection and return back on cancel', async () => {
    let wrapper = setup({} as EsQueryAlertParams<SearchType.searchSource>);
    await act(async () => {
      findTestSubject(wrapper, 'queryFormType_kql_or_lucene').simulate('click');
    });
    wrapper = await wrapper.update();
    expect(findTestSubject(wrapper, 'queryFormTypeChooserTitle').exists()).toBeFalsy();
    expect(findTestSubject(wrapper, 'selectDataViewExpression').exists()).toBeTruthy();

    await act(async () => {
      findTestSubject(wrapper, 'queryFormTypeChooserCancel').simulate('click');
    });
    wrapper = await wrapper.update();
    expect(findTestSubject(wrapper, 'selectDataViewExpression').exists()).toBeFalsy();
    expect(findTestSubject(wrapper, 'queryFormTypeChooserTitle').exists()).toBeTruthy();
  });

  test('should render QueryDSL view without the form type chooser if some rule params were passed', async () => {
    let wrapper: ReactWrapper;
    await act(async () => {
      wrapper = setup(defaultEsQueryRuleParams);
      wrapper = await wrapper.update();
    });
    expect(findTestSubject(wrapper!, 'queryFormTypeChooserTitle').exists()).toBeFalsy();
    expect(findTestSubject(wrapper!, 'queryFormTypeChooserCancel').exists()).toBeFalsy();
    expect(findTestSubject(wrapper!, 'selectIndexExpression').exists()).toBeTruthy();
  });

  test('should render KQL and Lucene view without the form type chooser if some rule params were passed', async () => {
    let wrapper: ReactWrapper;
    await act(async () => {
      wrapper = setup(defaultSearchSourceRuleParams);
      wrapper = await wrapper.update();
    });
    wrapper = await wrapper!.update();
    expect(findTestSubject(wrapper!, 'queryFormTypeChooserTitle').exists()).toBeFalsy();
    expect(findTestSubject(wrapper!, 'queryFormTypeChooserCancel').exists()).toBeFalsy();
    expect(findTestSubject(wrapper!, 'selectDataViewExpression').exists()).toBeTruthy();
  });
});
