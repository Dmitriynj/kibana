/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ENDPOINT_ACTIONS_INDEX = '.logs-endpoint.actions-default';
export const ENDPOINT_ACTION_RESPONSES_INDEX = '.logs-endpoint.action.responses-default';

export const eventsIndexPattern = 'logs-endpoint.events.*';
export const alertsIndexPattern = 'logs-endpoint.alerts-*';

/** index pattern for the data source index (data stream) that the Endpoint streams documents to */
export const metadataIndexPattern = 'metrics-endpoint.metadata-*';

/** index that the metadata transform writes to (destination) and that is used by endpoint APIs */
export const metadataCurrentIndexPattern = 'metrics-endpoint.metadata_current_*';

/** The metadata Transform Name prefix with NO (package) version) */
export const metadataTransformPrefix = 'endpoint.metadata_current-default';

/** The metadata Transform Name prefix with NO namespace and NO (package) version) */
export const metadataTransformPattern = 'endpoint.metadata_current-*';

export const METADATA_UNITED_TRANSFORM = 'endpoint.metadata_united-default';
export const METADATA_UNITED_INDEX = '.metrics-endpoint.metadata_united_default';

export const policyIndexPattern = 'metrics-endpoint.policy-*';
export const telemetryIndexPattern = 'metrics-endpoint.telemetry-*';
export const LIMITED_CONCURRENCY_ENDPOINT_ROUTE_TAG = 'endpoint:limited-concurrency';
export const LIMITED_CONCURRENCY_ENDPOINT_COUNT = 100;

export const BASE_ENDPOINT_ROUTE = '/api/endpoint';
export const HOST_METADATA_LIST_ROUTE = `${BASE_ENDPOINT_ROUTE}/metadata`;
export const HOST_METADATA_GET_ROUTE = `${BASE_ENDPOINT_ROUTE}/metadata/{id}`;

export const TRUSTED_APPS_GET_API = `${BASE_ENDPOINT_ROUTE}/trusted_apps/{id}`;
export const TRUSTED_APPS_LIST_API = `${BASE_ENDPOINT_ROUTE}/trusted_apps`;
export const TRUSTED_APPS_CREATE_API = `${BASE_ENDPOINT_ROUTE}/trusted_apps`;
export const TRUSTED_APPS_UPDATE_API = `${BASE_ENDPOINT_ROUTE}/trusted_apps/{id}`;
export const TRUSTED_APPS_DELETE_API = `${BASE_ENDPOINT_ROUTE}/trusted_apps/{id}`;
export const TRUSTED_APPS_SUMMARY_API = `${BASE_ENDPOINT_ROUTE}/trusted_apps/summary`;

export const BASE_POLICY_RESPONSE_ROUTE = `${BASE_ENDPOINT_ROUTE}/policy_response`;
export const BASE_POLICY_ROUTE = `${BASE_ENDPOINT_ROUTE}/policy`;
export const AGENT_POLICY_SUMMARY_ROUTE = `${BASE_POLICY_ROUTE}/summaries`;

/** Host Isolation Routes */
export const ISOLATE_HOST_ROUTE = `${BASE_ENDPOINT_ROUTE}/isolate`;
export const UNISOLATE_HOST_ROUTE = `${BASE_ENDPOINT_ROUTE}/unisolate`;

/** Endpoint Actions Log Routes */
export const ENDPOINT_ACTION_LOG_ROUTE = `/api/endpoint/action_log/{agent_id}`;
export const ACTION_STATUS_ROUTE = `/api/endpoint/action_status`;
