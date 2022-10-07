/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiExpression,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiText,
  useEuiPaddingCSS,
} from '@elastic/eui';
import type { DataViewListItem, DataView } from '@kbn/data-views-plugin/public';
import { useDiscoverAlertContext } from '@kbn/discover-plugin/public';
import { DataViewSelector } from '@kbn/unified-search-plugin/public';
import { useDiscoverAlertServices } from '../es_query/util';

export interface DataViewSelectPopoverProps {
  onSelectDataView: (selectedDataView: DataView) => void;
  dataViewName?: string;
  dataViewId?: string;
}

const toDataViewListItem = (dataView: DataView): DataViewListItem => {
  return {
    id: dataView.id!,
    title: dataView.title,
    name: dataView.name,
  };
};

export const DataViewSelectPopover: React.FunctionComponent<DataViewSelectPopoverProps> = ({
  onSelectDataView,
  dataViewName,
  dataViewId,
}) => {
  const { dataViews, dataViewEditor } = useDiscoverAlertServices();
  const discoverContext = useDiscoverAlertContext();
  const [adHocDataViews, setAdHocDataViews] = useState<DataViewListItem[]>(
    discoverContext.initialAdHocDataViewList
  );
  const [dataViewItems, setDataViewsItems] = useState<DataViewListItem[]>([]);
  const [dataViewPopoverOpen, setDataViewPopoverOpen] = useState(false);

  const closeDataViewEditor = useRef<() => void | undefined>();

  const allDataViewItems = useMemo(
    () => [...dataViewItems, ...adHocDataViews],
    [adHocDataViews, dataViewItems]
  );

  const closeDataViewPopover = useCallback(() => setDataViewPopoverOpen(false), []);

  const onChangeDataView = useCallback(
    async (selectedDataViewId: string) => {
      const selectedDataView = await dataViews.get(selectedDataViewId);
      onSelectDataView(selectedDataView);
      closeDataViewPopover();
    },
    [closeDataViewPopover, dataViews, onSelectDataView]
  );

  const loadPersistedDataViews = useCallback(async () => {
    const ids = await dataViews.getIds();
    const dataViewsList = await Promise.all(ids.map((id) => dataViews.get(id)));

    setDataViewsItems(
      dataViewsList.filter((current) => current.isTimeBased()).map(toDataViewListItem)
    );
  }, [dataViews]);

  const onAdHocDataView = useCallback(
    (adHocDataView: DataView) => {
      // populate discover state
      discoverContext.addAdHocDataView?.(adHocDataView);
      setAdHocDataViews((prev) => [...prev, toDataViewListItem(adHocDataView)]);
    },
    [discoverContext]
  );

  const createDataView = useMemo(
    () =>
      dataViewEditor.userPermissions.editDataView()
        ? () => {
            closeDataViewEditor.current = dataViewEditor.openEditor({
              onSave: async (createdDataView) => {
                if (createdDataView.id) {
                  if (!createdDataView.isPersisted()) {
                    onAdHocDataView(createdDataView);
                  }

                  await loadPersistedDataViews();
                  await onChangeDataView(createdDataView.id);
                }
              },
              allowAdHocDataView: true,
            });
          }
        : undefined,
    [dataViewEditor, loadPersistedDataViews, onChangeDataView, onAdHocDataView]
  );

  useEffect(() => {
    return () => {
      // Make sure to close the editor when unmounting
      if (closeDataViewEditor.current) {
        closeDataViewEditor.current();
      }
    };
  }, []);

  useEffect(() => {
    loadPersistedDataViews();
  }, [loadPersistedDataViews]);

  const createDataViewButtonPadding = useEuiPaddingCSS('left');

  const onCreateDefaultAdHocDataView = useCallback(
    async (pattern: string) => {
      const newDataView = await dataViews.create({ title: pattern });
      if (newDataView.fields.getByName('@timestamp')?.type === 'date') {
        newDataView.timeFieldName = '@timestamp';
      }
      // else if (newDataView.fields.getByName('timestamp')?.type === 'date') {
      //   newDataView.timeFieldName = 'timestamp';
      // }

      onAdHocDataView(newDataView);
      onChangeDataView(newDataView.id!);
    },
    [dataViews, onAdHocDataView, onChangeDataView]
  );

  if (!allDataViewItems) {
    return null;
  }

  return (
    <EuiPopover
      id="dataViewPopover"
      button={
        <EuiExpression
          display="columns"
          data-test-subj="selectDataViewExpression"
          description={i18n.translate('xpack.stackAlerts.components.ui.alertParams.dataViewLabel', {
            defaultMessage: 'data view',
          })}
          value={
            dataViewName ??
            i18n.translate('xpack.stackAlerts.components.ui.alertParams.dataViewPlaceholder', {
              defaultMessage: 'Select a data view',
            })
          }
          isActive={dataViewPopoverOpen}
          onClick={() => {
            setDataViewPopoverOpen(true);
          }}
          isInvalid={!dataViewId}
        />
      }
      isOpen={dataViewPopoverOpen}
      closePopover={closeDataViewPopover}
      ownFocus
      anchorPosition="downLeft"
      display="block"
    >
      <div style={{ width: '450px' }} data-test-subj="chooseDataViewPopoverContent">
        <EuiPopoverTitle>
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem>
              {i18n.translate('xpack.stackAlerts.components.ui.alertParams.dataViewPopoverTitle', {
                defaultMessage: 'Data view',
              })}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                data-test-subj="closeDataViewPopover"
                iconType="cross"
                color="danger"
                aria-label={i18n.translate(
                  'xpack.stackAlerts.components.ui.alertParams.closeDataViewPopoverLabel',
                  { defaultMessage: 'Close' }
                )}
                onClick={closeDataViewPopover}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPopoverTitle>
        <DataViewSelector
          currentDataViewId={dataViewId}
          dataViewsList={allDataViewItems}
          setPopoverIsOpen={setDataViewPopoverOpen}
          onChangeDataView={onChangeDataView}
          onCreateDefaultAdHocDataView={onCreateDefaultAdHocDataView}
          isTextBasedLangSelected={false}
        />
        {createDataView ? (
          <EuiPopoverFooter paddingSize="none">
            <EuiButtonEmpty
              css={createDataViewButtonPadding.s}
              iconType="plusInCircleFilled"
              data-test-subj="chooseDataViewPopover.createDataViewButton"
              onClick={() => {
                closeDataViewPopover();
                createDataView();
              }}
            >
              {i18n.translate(
                'xpack.stackAlerts.components.ui.alertParams.dataViewPopover.createDataViewButton',
                {
                  defaultMessage: 'Create a data view',
                }
              )}
            </EuiButtonEmpty>
          </EuiPopoverFooter>
        ) : (
          <EuiPopoverFooter>
            <EuiText color="subdued" size="xs">
              <FormattedMessage
                id="xpack.stackAlerts.components.ui.alertParams.dataViewPopover.createDataViewButton.noPermissionDescription"
                defaultMessage="You need additional privileges to create data views. Contact your administrator."
              />
            </EuiText>
          </EuiPopoverFooter>
        )}
      </div>
    </EuiPopover>
  );
};
