/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useState, useEffect, useMemo } from 'react';
import { Subscription } from 'rxjs';
import type { Query } from '@kbn/es-query';
import type { QueryStringContract } from '@kbn/data-plugin/public';

interface UseQueryStringProps {
  query?: Query;
  queryStringManager: QueryStringContract;
}
function isOfQueryType(arg: any): arg is Query {
  return Boolean(arg && 'query' in arg);
}
export const useQueryStringManager = (props: UseQueryStringProps) => {
  // Filters should be either what's passed in the initial state or the current state of the filter manager
  const [query, setQuery] = useState<Query>(props.query || props.queryStringManager.getQuery());
  useEffect(() => {
    const subscriptions = new Subscription();

    subscriptions.add(
      props.queryStringManager.getUpdates$().subscribe({
        next: () => {
          const newQuery = props.queryStringManager.getQuery();
          setQuery(newQuery);
        },
      })
    );

    return () => {
      subscriptions.unsubscribe();
    };
  }, [props.queryStringManager]);

  const isQueryType = isOfQueryType(query);
  const stableQuery = useMemo(
    () => ({
      language: query.language,
      query: query.query,
    }),
    [query.language, query.query]
  );
  return { query: isQueryType ? stableQuery : query };
};
