/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { useNavigationProps } from './use_navigation_props';
import type { DataView } from '@kbn/data-views-plugin/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { MemoryRouter } from 'react-router-dom';

const mockServices = {
  singleDocLocator: { navigate: jest.fn() },
  contextLocator: { navigate: jest.fn() },
  filterManager: {
    getAppFilters: jest.fn(() => []),
    getGlobalFilters: jest.fn(() => []),
  },
  data: {
    query: {
      queryString: { getQuery: jest.fn(() => ({ query: 'response:200', language: 'kuery' })) },
      timefilter: { timefilter: { getTime: jest.fn(() => ({ from: 'now-15m', to: 'now' })) } },
    },
  },
};

const dataViewMock = {
  id: '1',
  title: 'test',
  fields: [],
  isPersisted: () => false,
  toSpec: () => ({
    id: '1',
    title: 'test',
    fields: [],
  }),
} as unknown as DataView;

describe('useNavigationProps', () => {
  it('should call single doc callback with correct params', () => {
    const { result } = renderHook(
      () =>
        useNavigationProps({
          dataView: dataViewMock,
          rowIndex: 'mock-index',
          rowId: 'mock-id',
          columns: ['mock-column'],
        }),
      {
        wrapper: ({ children }) => (
          <MemoryRouter initialEntries={['/']}>
            <KibanaContextProvider services={mockServices}>{children}</KibanaContextProvider>
          </MemoryRouter>
        ),
      }
    );

    const commonParams = {
      index: {
        fields: [],
        id: '1',
        title: 'test',
      },
      query: {
        language: 'kuery',
        query: 'response:200',
      },
      rowId: 'mock-id',
      savedSearchId: undefined,
      columns: ['mock-column'],
      timeRange: {
        from: 'now-15m',
        to: 'now',
      },
      filters: [],
    };

    result.current.onOpenSurrDocs({ preventDefault: jest.fn() } as unknown as Event);
    expect(mockServices.contextLocator.navigate.mock.calls[0][0]).toEqual(commonParams);

    result.current.onOpenSingleDoc({ preventDefault: jest.fn() } as unknown as Event);
    expect(mockServices.singleDocLocator.navigate.mock.calls[0][0]).toEqual({
      ...commonParams,
      rowIndex: 'mock-index',
    });
  });
});
