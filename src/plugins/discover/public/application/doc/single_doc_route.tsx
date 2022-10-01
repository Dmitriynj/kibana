/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useEffect, useMemo, useRef } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useExecutionContext } from '@kbn/kibana-react-plugin/public';
import { i18n } from '@kbn/i18n';
import { LoadingIndicator } from '../../components/common/loading_indicator';
import { useDataView } from '../../hooks/use_data_view';
import { Doc } from './components/doc';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import { getScopedHistory } from '../../kibana_services';
import { SingleDocHistoryLocationState } from './locator';
import { DiscoverError } from '../../components/common/error_alert';

export interface DocUrlParams {
  dataViewId: string;
  index: string;
}

export const SingleDocRoute = () => {
  const { timefilter, core } = useDiscoverServices();
  const { search } = useLocation();
  const scopedHistory = getScopedHistory();
  const { dataViewId, index } = useParams<DocUrlParams>();

  const query = useMemo(() => new URLSearchParams(search), [search]);
  const id = query.get('id');

  const locationState = useRef(scopedHistory.location.state).current as
    | SingleDocHistoryLocationState
    | undefined;
  const dataViewSpec = locationState?.dataViewSpec;

  useExecutionContext(core.executionContext, {
    type: 'application',
    page: 'single-doc',
    id: dataViewId,
  });

  useEffect(() => {
    timefilter.disableAutoRefreshSelector();
    timefilter.disableTimeRangeSelector();
  });

  const { dataView, error } = useDataView({
    dataViewId: decodeURIComponent(dataViewId),
    dataViewSpec,
  });

  if (error) {
    return (
      <EuiEmptyPrompt
        iconType="alert"
        iconColor="danger"
        title={
          <FormattedMessage
            id="discover.singleDocRoute.errorTitle"
            defaultMessage="An error occurred"
          />
        }
        body={
          <FormattedMessage
            id="discover.singleDocRoute.errorMessage"
            defaultMessage="No matching data view for id {dataViewId}"
            values={{ dataViewId }}
          />
        }
      />
    );
  }

  if (!dataView) {
    return <LoadingIndicator />;
  }

  if (!id) {
    return (
      <DiscoverError
        error={
          new Error(
            i18n.translate('discover.discoverError.missingIdParamError', {
              defaultMessage: 'URL query string is missing id.',
            })
          )
        }
      />
    );
  }

  return (
    <div className="app-container">
      <Doc id={id} index={index} dataView={dataView} />
    </div>
  );
};
