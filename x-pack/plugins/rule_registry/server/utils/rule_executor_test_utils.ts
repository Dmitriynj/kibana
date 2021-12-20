/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from 'src/core/server';
import {
  elasticsearchServiceMock,
  httpServerMock,
  savedObjectsClientMock,
} from '../../../../../src/core/server/mocks';
import {
  AlertExecutorOptions,
  AlertInstanceContext,
  AlertInstanceState,
  AlertTypeParams,
  AlertTypeState,
} from '../../../alerting/server';
import { alertsMock } from '../../../alerting/server/mocks';
import { dataPluginMock } from '../../../../../src/plugins/data/server/mocks';

export const createDefaultAlertExecutorOptions = <
  Params extends AlertTypeParams = never,
  State extends AlertTypeState = never,
  InstanceState extends AlertInstanceState = {},
  InstanceContext extends AlertInstanceContext = {},
  ActionGroupIds extends string = ''
>({
  alertId = 'ALERT_INSTANCE_ID',
  ruleName = 'ALERT_RULE_NAME',
  params,
  state,
  createdAt = new Date(),
  startedAt = new Date(),
  updatedAt = new Date(),
  shouldWriteAlerts = true,
}: {
  alertId?: string;
  ruleName?: string;
  params: Params;
  state: State;
  createdAt?: Date;
  startedAt?: Date;
  updatedAt?: Date;
  shouldWriteAlerts?: boolean;
}): AlertExecutorOptions<Params, State, InstanceState, InstanceContext, ActionGroupIds> => ({
  alertId,
  createdBy: 'CREATED_BY',
  startedAt,
  name: ruleName,
  rule: {
    updatedBy: null,
    tags: [],
    name: ruleName,
    createdBy: null,
    actions: [],
    enabled: true,
    consumer: 'CONSUMER',
    producer: 'ALERT_PRODUCER',
    schedule: { interval: '1m' },
    throttle: null,
    createdAt,
    updatedAt,
    notifyWhen: null,
    ruleTypeId: 'RULE_TYPE_ID',
    ruleTypeName: 'RULE_TYPE_NAME',
  },
  tags: [],
  params,
  spaceId: 'SPACE_ID',
  request: KibanaRequest.from(
    httpServerMock.createRawRequest({
      app: { requestId: 'fakeId' },
    })
  ),
  services: {
    alertInstanceFactory: alertsMock.createAlertServices<InstanceState, InstanceContext>()
      .alertInstanceFactory,
    savedObjectsClient: savedObjectsClientMock.create(),
    scopedClusterClient: elasticsearchServiceMock.createScopedClusterClient(),
    shouldWriteAlerts: () => shouldWriteAlerts,
    shouldStopExecution: () => false,
    search: alertsMock.createAlertServices<InstanceState, InstanceContext>().search,
    data: dataPluginMock.createStartContract(),
  },
  state,
  updatedBy: null,
  previousStartedAt: null,
  namespace: undefined,
});
