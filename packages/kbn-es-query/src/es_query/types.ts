/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { estypes } from '@elastic/elasticsearch';

/**
 * A field's sub type
 * @public
 */
export interface IFieldSubType {
  multi?: { parent: string };
  nested?: { path: string };
}

/**
 * A base interface for an index pattern field
 * @public
 */
export interface IndexPatternFieldBase {
  name: string;
  /**
   * Kibana field type
   */
  type: string;
  subType?: IFieldSubType;
  /**
   * Scripted field painless script
   */
  script?: string;
  /**
   * Scripted field langauge
   * Painless is the only valid scripted field language
   */
  lang?: estypes.ScriptLanguage;
  scripted?: boolean;
}

/**
 * A base interface for an index pattern
 * @public
 */
export interface IndexPatternBase {
  fields: IndexPatternFieldBase[];
  id?: string;
  title?: string;
}

export interface BoolQuery {
  must: estypes.QueryDslQueryContainer[];
  must_not: estypes.QueryDslQueryContainer[];
  filter: estypes.QueryDslQueryContainer[];
  should: estypes.QueryDslQueryContainer[];
}
