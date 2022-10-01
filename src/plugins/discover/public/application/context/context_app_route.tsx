/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { ContextApp } from './context_app';
import { LoadingIndicator } from '../../components/common/loading_indicator';
import { useDataView } from '../../hooks/use_data_view';
import { getScopedHistory } from '../../kibana_services';
import { ContextHistoryLocationState } from './services/locator';

export interface ContextUrlParams {
  dataViewId: string;
  id: string;
}

export function ContextAppRoute() {
  const scopedHistory = getScopedHistory();
  const [locationState, setLocationState] = React.useState<ContextHistoryLocationState>(
    scopedHistory.location.state as ContextHistoryLocationState
  );
  const dataViewSpec = locationState?.dataViewSpec;

  const { dataViewId: encodedDataViewId, id } = useParams<ContextUrlParams>();
  const dataViewId = decodeURIComponent(encodedDataViewId);
  const anchorId = decodeURIComponent(id);

  useEffect(() => {
    setLocationState(scopedHistory.location.state as ContextHistoryLocationState);
  }, [dataViewId, scopedHistory.location.state]);

  const { dataView, error } = useDataView({ dataViewId, dataViewSpec });

  if (error) {
    return (
      <EuiEmptyPrompt
        iconType="alert"
        iconColor="danger"
        title={
          <FormattedMessage
            id="discover.contextViewRoute.errorTitle"
            defaultMessage="An error occurred"
          />
        }
        body={
          <FormattedMessage
            id="discover.contextViewRoute.errorMessage"
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

  return <ContextApp anchorId={anchorId} dataView={dataView} locationState={locationState} />;
}
