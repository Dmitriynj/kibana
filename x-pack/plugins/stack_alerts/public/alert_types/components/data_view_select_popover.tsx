/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiExpression,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
} from '@elastic/eui';
import { DataViewsList } from '@kbn/unified-search-plugin/public';
import { DataViewListItem } from '@kbn/data-views-plugin/public';
import { useTriggersAndActionsUiDeps } from '../es_query/util';

export interface DataViewSelectPopoverProps {
  onSelectDataView: (newDataViewId: string) => void;
  dataViewName?: string;
  dataViewId?: string;
}

export const DataViewSelectPopover: React.FunctionComponent<DataViewSelectPopoverProps> = ({
  onSelectDataView,
  dataViewName,
  dataViewId,
}) => {
  const { data, dataViewEditor } = useTriggersAndActionsUiDeps();
  const [dataViewItems, setDataViewsItems] = useState<DataViewListItem[]>();
  const [dataViewPopoverOpen, setDataViewPopoverOpen] = useState(false);

  const closeDataViewEditor = useRef<() => void | undefined>();

  const loadDataViews = useCallback(async () => {
    const fetchedDataViewItems = await data.dataViews.getIdsWithTitle();
    setDataViewsItems(fetchedDataViewItems);
  }, [setDataViewsItems, data.dataViews]);

  const closeDataViewPopover = useCallback(() => setDataViewPopoverOpen(false), []);

  const createDataView = useMemo(
    () =>
      dataViewEditor?.userPermissions.editDataView()
        ? () => {
            closeDataViewEditor.current = dataViewEditor.openEditor({
              onSave: async (createdDataView) => {
                if (createdDataView.id) {
                  await onSelectDataView(createdDataView.id);
                  await loadDataViews();
                }
              },
            });
          }
        : undefined,
    [dataViewEditor, onSelectDataView, loadDataViews]
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
    loadDataViews();
  }, [loadDataViews]);

  if (!dataViewItems) {
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
        <EuiFormRow id="indexSelectSearchBox" fullWidth>
          <DataViewsList
            dataViewsList={dataViewItems}
            onChangeDataView={(newId) => {
              onSelectDataView(newId);
              closeDataViewPopover();
            }}
            currentDataViewId={dataViewId}
          />
        </EuiFormRow>
        {createDataView && (
          <EuiPopoverFooter>
            <EuiButtonEmpty
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
        )}
      </div>
    </EuiPopover>
  );
};
