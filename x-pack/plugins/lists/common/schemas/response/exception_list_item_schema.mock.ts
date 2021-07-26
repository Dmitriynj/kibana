/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';

import {
  COMMENTS,
  DATE_NOW,
  DESCRIPTION,
  ELASTIC_USER,
  ENTRIES,
  ITEM_ID,
  ITEM_TYPE,
  LIST_ID,
  META,
  NAME,
  NAMESPACE_TYPE,
  OS_TYPES,
  TIE_BREAKER,
  USER,
} from '../../constants.mock';

export const getExceptionListItemSchemaMock = (
  overrides?: Partial<ExceptionListItemSchema>
): ExceptionListItemSchema => ({
  _version: undefined,
  comments: COMMENTS,
  created_at: DATE_NOW,
  created_by: USER,
  description: DESCRIPTION,
  entries: ENTRIES,
  id: '1',
  item_id: 'endpoint_list_item',
  list_id: 'endpoint_list_id',
  meta: META,
  name: NAME,
  namespace_type: NAMESPACE_TYPE,
  os_types: [],
  tags: ['user added string for a tag', 'malware'],
  tie_breaker_id: TIE_BREAKER,
  type: ITEM_TYPE,
  updated_at: DATE_NOW,
  updated_by: USER,
  ...(overrides || {}),
});

/**
 * This is useful for end to end tests where we remove the auto generated parts for comparisons
 * such as created_at, updated_at, and id.
 */
export const getExceptionListItemResponseMockWithoutAutoGeneratedValues = (): Partial<ExceptionListItemSchema> => ({
  comments: [],
  created_by: ELASTIC_USER,
  description: DESCRIPTION,
  entries: ENTRIES,
  item_id: ITEM_ID,
  list_id: LIST_ID,
  name: NAME,
  namespace_type: 'single',
  os_types: OS_TYPES,
  tags: [],
  type: ITEM_TYPE,
  updated_by: ELASTIC_USER,
});
