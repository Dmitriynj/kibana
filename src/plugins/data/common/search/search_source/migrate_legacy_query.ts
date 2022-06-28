/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { Query, AggregateQuery } from '@kbn/es-query';
import { has } from 'lodash';

function isOfAggregateQueryType(query: AggregateQuery | Query): query is AggregateQuery {
  return Boolean(query && 'sql' in query);
}

/**
 * Creates a standardized query object from old queries that were either strings or pure ES query DSL
 *
 * @param query - a legacy query, what used to be stored in SearchSource's query property
 * @return Object
 */

export function migrateLegacyQuery(query: Query | { [key: string]: any } | string): Query {
  // Lucene was the only option before, so language-less queries are all lucene
  if (!has(query, 'language')) {
    if (typeof query === 'object' && isOfAggregateQueryType(query)) {
      return query as Query;
    }
    return { query, language: 'lucene' };
  }

  return query as Query;
}
