/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef } from 'react';
import classNames from 'classnames';
import d3, { ZoomEvent } from 'd3';
import { isColorDark, hexToRgb } from '@elastic/eui';
import {
  GroupAwareWorkspaceNode,
  GroupAwareWorkspaceEdge,
  Workspace,
  WorkspaceNode,
  TermIntersect,
  ControlType,
} from '../../types';
import { makeNodeId } from '../../services/persistence';

export interface GraphVisualizationProps {
  workspace: Workspace;
  onSetControl: (control: ControlType) => void;
  selectSelected: (node: WorkspaceNode) => void;
  onSetMergeCandidates: (terms: TermIntersect[]) => void;
}

function registerZooming(element: SVGSVGElement) {
  const blockScroll = function () {
    (d3.event as Event).preventDefault();
  };
  d3.select(element)
    .on('mousewheel', blockScroll)
    .on('DOMMouseScroll', blockScroll)
    .call(
      d3.behavior.zoom().on('zoom', () => {
        const event = d3.event as ZoomEvent;
        d3.select(element)
          .select('g')
          .attr('transform', 'translate(' + event.translate + ')' + 'scale(' + event.scale + ')')
          .attr('style', 'stroke-width: ' + 1 / event.scale);
      })
    );
}

export function GraphVisualization({
  workspace,
  selectSelected,
  onSetControl,
  onSetMergeCandidates,
}: GraphVisualizationProps) {
  const svgRoot = useRef<SVGSVGElement | null>(null);

  const nodeClick = (n: GroupAwareWorkspaceNode, event: React.MouseEvent) => {
    // Selection logic - shift key+click helps selects multiple nodes
    // Without the shift key we deselect all prior selections (perhaps not
    // a great idea for touch devices with no concept of shift key)
    if (!event.shiftKey) {
      const prevSelection = n.isSelected;
      workspace.selectNone();
      n.isSelected = prevSelection;
    }
    if (workspace.toggleNodeSelection(n)) {
      selectSelected(n);
    } else {
      onSetControl('none');
    }
    workspace.changeHandler();
  };

  const handleMergeCandidatesCallback = (termIntersects: TermIntersect[]) => {
    const mergeCandidates: TermIntersect[] = [];
    termIntersects.forEach((ti) => {
      mergeCandidates.push({
        id1: ti.id1,
        id2: ti.id2,
        term1: ti.term1,
        term2: ti.term2,
        v1: ti.v1,
        v2: ti.v2,
        overlap: ti.overlap,
      });
    });
    onSetMergeCandidates(mergeCandidates);
    onSetControl('mergeTerms');
  };

  const edgeClick = (edge: GroupAwareWorkspaceEdge) =>
    workspace.getAllIntersections(handleMergeCandidatesCallback, [edge.topSrc, edge.topTarget]);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="gphGraph"
      width="100%"
      height="100%"
      pointerEvents="all"
      id="graphSvg"
      ref={(element) => {
        if (element && svgRoot.current !== element) {
          svgRoot.current = element;
          registerZooming(element);
        }
      }}
    >
      <g>
        <g>
          {workspace.edges &&
            workspace.edges.map((edge) => (
              <line
                key={`${makeNodeId(edge.source.data.field, edge.source.data.term)}-${makeNodeId(
                  edge.target.data.field,
                  edge.target.data.term
                )}`}
                x1={edge.topSrc.kx}
                y1={edge.topSrc.ky}
                x2={edge.topTarget.kx}
                y2={edge.topTarget.ky}
                onClick={() => {
                  edgeClick(edge);
                }}
                className={classNames('gphEdge', {
                  'gphEdge--selected': edge.isSelected,
                })}
                style={{ strokeWidth: edge.width }}
                strokeLinecap="round"
              />
            ))}
        </g>
        {workspace.nodes &&
          workspace.nodes
            .filter((node) => !node.parent)
            .map((node) => (
              <g
                key={makeNodeId(node.data.field, node.data.term)}
                onClick={(e) => {
                  nodeClick(node, e);
                }}
                onMouseDown={(e) => {
                  // avoid selecting text when selecting nodes
                  if (e.ctrlKey || e.shiftKey) {
                    e.preventDefault();
                  }
                }}
                className="gphNode"
              >
                <circle
                  cx={node.kx}
                  cy={node.ky}
                  r={node.scaledSize}
                  className={classNames('gphNode__circle', {
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    'gphNode__circle--selected': node.isSelected,
                  })}
                  style={{ fill: node.color }}
                />
                {node.icon && (
                  <text
                    className={classNames('fa gphNode__text', {
                      // eslint-disable-next-line @typescript-eslint/naming-convention
                      'gphNode__text--inverse': isColorDark(...hexToRgb(node.color)),
                    })}
                    transform="translate(0,5)"
                    textAnchor="middle"
                    x={node.kx}
                    y={node.ky}
                  >
                    {node.icon.code}
                  </text>
                )}

                {node.label.length < 30 && (
                  <text
                    className="gphNode__label"
                    textAnchor="middle"
                    transform="translate(0,22)"
                    x={node.kx}
                    y={node.ky}
                  >
                    {node.label}
                  </text>
                )}
                {node.label.length >= 30 && (
                  <foreignObject
                    width="100"
                    height="20"
                    transform="translate(-50,15)"
                    x={node.kx}
                    y={node.ky}
                  >
                    <p className="gphNode__label gphNode__label--html gphNoUserSelect">
                      {node.label}
                    </p>
                  </foreignObject>
                )}

                {node.numChildren > 0 && (
                  <g>
                    <circle
                      r="5"
                      className="gphNode__markerCircle"
                      transform="translate(10,10)"
                      cx={node.kx}
                      cy={node.ky}
                    />
                    <text
                      className="gphNode__markerText"
                      textAnchor="middle"
                      transform="translate(10,12)"
                      x={node.kx}
                      y={node.ky}
                    >
                      {node.numChildren}
                    </text>
                  </g>
                )}
              </g>
            ))}
      </g>
    </svg>
  );
}
