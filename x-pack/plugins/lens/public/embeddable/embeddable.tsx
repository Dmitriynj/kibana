/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual, uniqBy } from 'lodash';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import type { ExecutionContextServiceStart } from 'src/core/public';
import {
  ExecutionContextSearch,
  Filter,
  Query,
  TimefilterContract,
  TimeRange,
  IndexPattern,
} from 'src/plugins/data/public';
import { PaletteOutput } from 'src/plugins/charts/public';

import { Subscription } from 'rxjs';
import { toExpression, Ast } from '@kbn/interpreter/common';
import { DefaultInspectorAdapters, RenderMode } from 'src/plugins/expressions';
import { map, distinctUntilChanged, skip } from 'rxjs/operators';
import fastIsEqual from 'fast-deep-equal';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/public';
import { METRIC_TYPE } from '@kbn/analytics';
import {
  ExpressionRendererEvent,
  ReactExpressionRendererType,
} from '../../../../../src/plugins/expressions/public';
import { VIS_EVENT_TO_TRIGGER } from '../../../../../src/plugins/visualizations/public';

import {
  Embeddable as AbstractEmbeddable,
  EmbeddableInput,
  EmbeddableOutput,
  IContainer,
  SavedObjectEmbeddableInput,
  ReferenceOrValueEmbeddable,
} from '../../../../../src/plugins/embeddable/public';
import { Document, injectFilterReferences } from '../persistence';
import { ExpressionWrapper } from './expression_wrapper';
import { UiActionsStart } from '../../../../../src/plugins/ui_actions/public';
import {
  isLensBrushEvent,
  isLensFilterEvent,
  isLensTableRowContextMenuClickEvent,
  LensBrushEvent,
  LensFilterEvent,
  LensTableRowContextMenuEvent,
} from '../types';

import { IndexPatternsContract } from '../../../../../src/plugins/data/public';
import { getEditPath, DOC_TYPE, PLUGIN_ID } from '../../common';
import { IBasePath } from '../../../../../src/core/public';
import { LensAttributeService } from '../lens_attribute_service';
import type { ErrorMessage } from '../editor_frame_service/types';

export type LensSavedObjectAttributes = Omit<Document, 'savedObjectId' | 'type'>;

interface LensBaseEmbeddableInput extends EmbeddableInput {
  filters?: Filter[];
  query?: Query;
  timeRange?: TimeRange;
  palette?: PaletteOutput;
  renderMode?: RenderMode;
  style?: React.CSSProperties;
  className?: string;
  onBrushEnd?: (data: LensBrushEvent['data']) => void;
  onLoad?: (isLoading: boolean) => void;
  onFilter?: (data: LensFilterEvent['data']) => void;
  onTableRowClick?: (data: LensTableRowContextMenuEvent['data']) => void;
}

export type LensByValueInput = {
  attributes: LensSavedObjectAttributes;
} & LensBaseEmbeddableInput;

export type LensByReferenceInput = SavedObjectEmbeddableInput & LensBaseEmbeddableInput;
export type LensEmbeddableInput = LensByValueInput | LensByReferenceInput;

export interface LensEmbeddableOutput extends EmbeddableOutput {
  indexPatterns?: IndexPattern[];
}

export interface LensEmbeddableDeps {
  attributeService: LensAttributeService;
  documentToExpression: (
    doc: Document
  ) => Promise<{ ast: Ast | null; errors: ErrorMessage[] | undefined }>;
  indexPatternService: IndexPatternsContract;
  expressionRenderer: ReactExpressionRendererType;
  timefilter: TimefilterContract;
  basePath: IBasePath;
  getTrigger?: UiActionsStart['getTrigger'] | undefined;
  getTriggerCompatibleActions?: UiActionsStart['getTriggerCompatibleActions'];
  capabilities: { canSaveVisualizations: boolean; canSaveDashboards: boolean };
  usageCollection?: UsageCollectionSetup;
  executionContext: ExecutionContextServiceStart;
}

export class Embeddable
  extends AbstractEmbeddable<LensEmbeddableInput, LensEmbeddableOutput>
  implements ReferenceOrValueEmbeddable<LensByValueInput, LensByReferenceInput> {
  type = DOC_TYPE;

  private expressionRenderer: ReactExpressionRendererType;
  private savedVis: Document | undefined;
  private expression: string | undefined | null;
  private domNode: HTMLElement | Element | undefined;
  private subscription: Subscription;
  private isInitialized = false;
  private activeData: Partial<DefaultInspectorAdapters> | undefined;
  private errors: ErrorMessage[] | undefined;
  private inputReloadSubscriptions: Subscription[];
  private isDestroyed?: boolean;

  private logError(type: 'runtime' | 'validation') {
    this.deps.usageCollection?.reportUiCounter(
      PLUGIN_ID,
      METRIC_TYPE.COUNT,
      type === 'runtime' ? 'embeddable_runtime_error' : 'embeddable_validation_error'
    );
  }

  private externalSearchContext: {
    timeRange?: TimeRange;
    query?: Query;
    filters?: Filter[];
    searchSessionId?: string;
  } = {};

  constructor(
    private deps: LensEmbeddableDeps,
    initialInput: LensEmbeddableInput,
    parent?: IContainer
  ) {
    super(
      initialInput,
      {
        editApp: 'lens',
      },
      parent
    );

    this.expressionRenderer = deps.expressionRenderer;
    this.initializeSavedVis(initialInput).then(() => this.onContainerStateChanged(initialInput));
    this.subscription = this.getUpdated$().subscribe(() =>
      this.onContainerStateChanged(this.input)
    );

    const input$ = this.getInput$();

    this.inputReloadSubscriptions = [];

    // Lens embeddable does not re-render when embeddable input changes in
    // general, to improve performance. This line makes sure the Lens embeddable
    // re-renders when anything in ".dynamicActions" (e.g. drilldowns) changes.
    this.inputReloadSubscriptions.push(
      input$
        .pipe(
          map((input) => input.enhancements?.dynamicActions),
          distinctUntilChanged((a, b) => fastIsEqual(a, b)),
          skip(1)
        )
        .subscribe((input) => {
          this.reload();
        })
    );

    // Lens embeddable does not re-render when embeddable input changes in
    // general, to improve performance. This line makes sure the Lens embeddable
    // re-renders when dashboard view mode switches between "view/edit". This is
    // needed to see the changes to ".dynamicActions" (e.g. drilldowns) when
    // dashboard's mode is toggled.
    this.inputReloadSubscriptions.push(
      input$
        .pipe(
          map((input) => input.viewMode),
          distinctUntilChanged(),
          skip(1)
        )
        .subscribe((input) => {
          // only reload if drilldowns are set
          if (this.getInput().enhancements?.dynamicActions) {
            this.reload();
          }
        })
    );

    // Re-initialize the visualization if either the attributes or the saved object id changes

    this.inputReloadSubscriptions.push(
      input$
        .pipe(
          distinctUntilChanged((a, b) =>
            fastIsEqual(
              ['attributes' in a && a.attributes, 'savedObjectId' in a && a.savedObjectId],
              ['attributes' in b && b.attributes, 'savedObjectId' in b && b.savedObjectId]
            )
          ),
          skip(1)
        )
        .subscribe(async (input) => {
          await this.initializeSavedVis(input);
          this.reload();
        })
    );

    // Update search context and reload on changes related to search
    this.inputReloadSubscriptions.push(
      this.getUpdated$()
        .pipe(map(() => this.getInput()))
        .pipe(
          distinctUntilChanged((a, b) =>
            fastIsEqual(
              [a.filters, a.query, a.timeRange, a.searchSessionId],
              [b.filters, b.query, b.timeRange, b.searchSessionId]
            )
          ),
          skip(1)
        )
        .subscribe(async (input) => {
          this.onContainerStateChanged(input);
        })
    );
  }

  public supportedTriggers() {
    if (!this.savedVis) {
      return [];
    }
    switch (this.savedVis.visualizationType) {
      case 'lnsXY':
        return [VIS_EVENT_TO_TRIGGER.filter, VIS_EVENT_TO_TRIGGER.brush];
      case 'lnsDatatable':
        return [VIS_EVENT_TO_TRIGGER.filter, VIS_EVENT_TO_TRIGGER.tableRowContextMenuClick];
      case 'lnsPie':
        return [VIS_EVENT_TO_TRIGGER.filter];
      case 'lnsMetric':
      default:
        return [];
    }
  }

  public getInspectorAdapters() {
    return this.activeData;
  }

  async initializeSavedVis(input: LensEmbeddableInput) {
    const attributes:
      | LensSavedObjectAttributes
      | false = await this.deps.attributeService.unwrapAttributes(input).catch((e: Error) => {
      this.onFatalError(e);
      return false;
    });
    if (!attributes || this.isDestroyed) {
      return;
    }
    this.savedVis = {
      ...attributes,
      type: this.type,
      savedObjectId: (input as LensByReferenceInput)?.savedObjectId,
    };
    const { ast, errors } = await this.deps.documentToExpression(this.savedVis);
    this.errors = errors;
    this.expression = ast ? toExpression(ast) : null;
    if (errors) {
      this.logError('validation');
    }
    await this.initializeOutput();
    this.isInitialized = true;
  }

  onContainerStateChanged(containerState: LensEmbeddableInput) {
    if (this.handleContainerStateChanged(containerState)) this.reload();
  }

  handleContainerStateChanged(containerState: LensEmbeddableInput): boolean {
    let isDirty = false;
    const cleanedFilters = containerState.filters
      ? containerState.filters.filter((filter) => !filter.meta.disabled)
      : undefined;
    if (
      !isEqual(containerState.timeRange, this.externalSearchContext.timeRange) ||
      !isEqual(containerState.query, this.externalSearchContext.query) ||
      !isEqual(cleanedFilters, this.externalSearchContext.filters) ||
      this.externalSearchContext.searchSessionId !== containerState.searchSessionId
    ) {
      this.externalSearchContext = {
        timeRange: containerState.timeRange,
        query: containerState.query,
        filters: cleanedFilters,
        searchSessionId: containerState.searchSessionId,
      };
      isDirty = true;
    }
    return isDirty;
  }

  private updateActiveData = (
    data: unknown,
    inspectorAdapters?: Partial<DefaultInspectorAdapters> | undefined
  ) => {
    this.activeData = inspectorAdapters;
    if (this.input.onLoad) {
      // once onData$ is get's called from expression renderer, loading becomes false
      this.input.onLoad(false);
    }
  };

  /**
   *
   * @param {HTMLElement} domNode
   * @param {ContainerState} containerState
   */
  render(domNode: HTMLElement | Element) {
    this.domNode = domNode;
    if (!this.savedVis || !this.isInitialized || this.isDestroyed) {
      return;
    }
    if (this.input.onLoad) {
      this.input.onLoad(true);
    }
    const executionContext = this.deps.executionContext.create({
      type: 'lens',
      name: this.savedVis.visualizationType ?? '',
      description: this.savedVis.title ?? this.savedVis.description ?? '',
      id: this.id,
      url: this.output.editUrl,
    });
    const input = this.getInput();

    render(
      <ExpressionWrapper
        ExpressionRenderer={this.expressionRenderer}
        expression={this.expression || null}
        errors={this.errors}
        searchContext={this.getMergedSearchContext()}
        variables={input.palette ? { theme: { palette: input.palette } } : {}}
        searchSessionId={this.externalSearchContext.searchSessionId}
        handleEvent={this.handleEvent}
        onData$={this.updateActiveData}
        renderMode={input.renderMode}
        syncColors={input.syncColors}
        hasCompatibleActions={this.hasCompatibleActions}
        className={input.className}
        style={input.style}
        executionContext={executionContext}
        canEdit={this.getIsEditable() && input.viewMode === 'edit'}
        onRuntimeError={() => {
          this.logError('runtime');
        }}
      />,
      domNode
    );
  }

  private readonly hasCompatibleActions = async (
    event: ExpressionRendererEvent
  ): Promise<boolean> => {
    if (isLensTableRowContextMenuClickEvent(event)) {
      const { getTriggerCompatibleActions } = this.deps;
      if (!getTriggerCompatibleActions) {
        return false;
      }
      const actions = await getTriggerCompatibleActions(VIS_EVENT_TO_TRIGGER[event.name], {
        data: event.data,
        embeddable: this,
      });

      return actions.length > 0;
    }

    return false;
  };

  /**
   * Combines the embeddable context with the saved object context, and replaces
   * any references to index patterns
   */
  private getMergedSearchContext(): ExecutionContextSearch {
    if (!this.savedVis) {
      throw new Error('savedVis is required for getMergedSearchContext');
    }
    const output: ExecutionContextSearch = {
      timeRange: this.externalSearchContext.timeRange,
    };
    if (this.externalSearchContext.query) {
      output.query = [this.externalSearchContext.query, this.savedVis.state.query];
    } else {
      output.query = [this.savedVis.state.query];
    }
    if (this.externalSearchContext.filters?.length) {
      output.filters = [...this.externalSearchContext.filters, ...this.savedVis.state.filters];
    } else {
      output.filters = [...this.savedVis.state.filters];
    }

    output.filters = injectFilterReferences(output.filters, this.savedVis.references);
    return output;
  }

  handleEvent = (event: ExpressionRendererEvent) => {
    if (!this.deps.getTrigger || this.input.disableTriggers) {
      return;
    }
    if (isLensBrushEvent(event)) {
      this.deps.getTrigger(VIS_EVENT_TO_TRIGGER[event.name]).exec({
        data: event.data,
        embeddable: this,
      });

      if (this.input.onBrushEnd) {
        this.input.onBrushEnd(event.data);
      }
    }
    if (isLensFilterEvent(event)) {
      this.deps.getTrigger(VIS_EVENT_TO_TRIGGER[event.name]).exec({
        data: event.data,
        embeddable: this,
      });
      if (this.input.onFilter) {
        this.input.onFilter(event.data);
      }
    }

    if (isLensTableRowContextMenuClickEvent(event)) {
      this.deps.getTrigger(VIS_EVENT_TO_TRIGGER[event.name]).exec(
        {
          data: event.data,
          embeddable: this,
        },
        true
      );
      if (this.input.onTableRowClick) {
        this.input.onTableRowClick((event.data as unknown) as LensTableRowContextMenuEvent['data']);
      }
    }
  };

  async reload() {
    if (!this.savedVis || !this.isInitialized || this.isDestroyed) {
      return;
    }
    this.handleContainerStateChanged(this.input);
    if (this.domNode) {
      this.render(this.domNode);
    }
  }

  async initializeOutput() {
    if (!this.savedVis) {
      return;
    }
    const responses = await Promise.allSettled(
      uniqBy(
        this.savedVis.references.filter(({ type }) => type === 'index-pattern'),
        'id'
      ).map(({ id }) => this.deps.indexPatternService.get(id))
    );
    const indexPatterns = responses
      .filter(
        (response): response is PromiseFulfilledResult<IndexPattern> =>
          response.status === 'fulfilled'
      )
      .map(({ value }) => value);

    // passing edit url and index patterns to the output of this embeddable for
    // the container to pick them up and use them to configure filter bar and
    // config dropdown correctly.
    const input = this.getInput();
    const title = input.hidePanelTitles ? '' : input.title || this.savedVis.title;
    const savedObjectId = (input as LensByReferenceInput).savedObjectId;
    this.updateOutput({
      ...this.getOutput(),
      defaultTitle: this.savedVis.title,
      editable: this.getIsEditable(),
      title,
      editPath: getEditPath(savedObjectId),
      editUrl: this.deps.basePath.prepend(`/app/lens${getEditPath(savedObjectId)}`),
      indexPatterns,
    });
  }

  private getIsEditable() {
    return (
      this.deps.capabilities.canSaveVisualizations ||
      (!this.inputIsRefType(this.getInput()) && this.deps.capabilities.canSaveDashboards)
    );
  }

  public inputIsRefType = (
    input: LensByValueInput | LensByReferenceInput
  ): input is LensByReferenceInput => {
    return this.deps.attributeService.inputIsRefType(input);
  };

  public getInputAsRefType = async (): Promise<LensByReferenceInput> => {
    const input = this.deps.attributeService.getExplicitInputFromEmbeddable(this);
    return this.deps.attributeService.getInputAsRefType(input, {
      showSaveModal: true,
      saveModalTitle: this.getTitle(),
    });
  };

  public getInputAsValueType = async (): Promise<LensByValueInput> => {
    const input = this.deps.attributeService.getExplicitInputFromEmbeddable(this);
    return this.deps.attributeService.getInputAsValueType(input);
  };

  // same API as Visualize
  public getDescription() {
    // mind that savedViz is loaded in async way here
    return this.savedVis && this.savedVis.description;
  }

  destroy() {
    super.destroy();
    this.isDestroyed = true;
    if (this.inputReloadSubscriptions.length > 0) {
      this.inputReloadSubscriptions.forEach((reloadSub) => {
        reloadSub.unsubscribe();
      });
    }
    if (this.domNode) {
      unmountComponentAtNode(this.domNode);
    }
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}
