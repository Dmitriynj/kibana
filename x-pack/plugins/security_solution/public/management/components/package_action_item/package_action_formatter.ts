/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { DocLinks } from '@kbn/doc-links';

type PackageActions = 'es_connection';

export const titles = Object.freeze(
  new Map<PackageActions, string>([
    [
      'es_connection',
      i18n.translate('xpack.securitySolution.endpoint.details.packageActions.es_connection.title', {
        defaultMessage: 'Elasticsearch connection failure',
      }),
    ],
  ])
);

export const descriptions = Object.freeze(
  new Map<Partial<PackageActions> | string, string>([
    [
      'es_connection',
      i18n.translate(
        'xpack.securitySolution.endpoint.details.packageActions.es_connection.description',
        {
          defaultMessage:
            "The endpoint's connection to Elasticsearch is either down or misconfigured. Make sure it is configured correctly.",
        }
      ),
    ],
  ])
);

const linkTexts = Object.freeze(
  new Map<Partial<PackageActions> | string, string>([
    [
      'es_connection',
      i18n.translate(
        'xpack.securitySolution.endpoint.details.packageActions.link.text.es_connection',
        {
          defaultMessage: ' Read more.',
        }
      ),
    ],
  ])
);

export class PackageActionFormatter {
  public key: PackageActions;
  public title: string;
  public description: string;
  public linkText?: string;

  constructor(
    code: number,
    message: string,
    private docLinks: DocLinks['securitySolution']['packageActionTroubleshooting']
  ) {
    this.key = this.getKeyFromErrorCode(code);
    this.title = titles.get(this.key) ?? this.key;
    this.description = descriptions.get(this.key) || message;
    this.linkText = linkTexts.get(this.key);
  }

  public get linkUrl(): string {
    return this.docLinks[this.key];
  }

  private getKeyFromErrorCode(code: number): PackageActions {
    if (code === 123) {
      return 'es_connection';
    } else {
      throw new Error(`Invalid error code ${code}`);
    }
  }
}
