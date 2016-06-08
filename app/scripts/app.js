"use strict";
// const rdf = require('rdf-ext');
// const rdfaParser = require('rdf-parser-rdfa');
// const RDFaProcessor = require('green-turtle');
  // resolves to '/node_modules/green-turtle/build/RDFa.js' ?
import {rdfaSubjects2jsonGraph}  from './rdf/rdf-utils';
const d3 = require('d3');
const $ = require('jquery');

const flatMap = [(flatMap, item) => flatMap.concat(item), []];
const unique = [(uniqueMap, item) => uniqueMap.indexOf(item) === -1 ? uniqueMap.concat(item) : uniqueMap, []];
const hashMap = (obj, fn=(val) => val) => Object.keys(obj).map(key => fn(obj[key], key));

const baseURI = 'http://localhost:8080/api/v2/doc/www.npr.org/sections/itsallpolitics/2015/08/20/433253554/iran-lobbying-battle-heats-up-on-the-airwaves/';
const MARGIN = 30;

const getObjectsByCurie = (rdf, curie, subject) => subject.getValues(rdf.expand(curie));
const getLabelsForEntityType = (rdf, entityType) => rdf.getSubjects("fise:entity-type", entityType)
  .map(rdf.getSubject.bind(rdf))
  .map(subject => getObjectsByCurie(rdf, 'fise:entity-label', subject));


const app = {
  init() {
    this.rdf = document.data;
    this.getObjectsByCurie = _.curry(getObjectsByCurie)(this.rdf);


    this.buildGraph();
    this.attachEventListeners();
    this.makeD3Graph(this.graph);
  },

  buildGraph() {

    const getSubject = this.rdf.getSubject.bind(this.rdf);
    const expandCurie = this.rdf.expand.bind(this.rdf);
    const entities = this.rdf.getSubjects()
      .map(s => this.rdf.getSubject(s))
      .filter(subject => subject.types.indexOf(expandCurie('fise:EntityAnnotation')) > -1);

    const entityNodes = entities
      .filter(entity => entity.id)
      .reduce((nodeMap, entity) => {
        nodeMap[entity.id] = {
          id: entity.id,
          label: entity.getValues('fise:entity-label').join(' - '),
          type: entity.getValues('fise:entity-type').join(' - ')
        };
        return nodeMap;
      }, {});

    const objectNodes = entities
      .filter(entity => entity.getValues('fise:entity-reference').length > 0)
      .filter(entity => entity.id)
      .reduce((nodeMap, entity) => {
        entity.getValues('fise:entity-reference')
          .forEach(objectUri => {
            nodeMap[objectUri] = {type: 'Object', id: objectUri};
          });

        return nodeMap;
      });

    const allNodesMap = Object.assign(entityNodes, objectNodes);

    const edges = entities
      .filter(entity => entity.getValues('fise:entity-reference').length > 0)
      .reduce((edges, entity) => {
        const source = entity.id;
        const target = entity.getValues('fise:entity-reference')[0];
        if (!allNodesMap[source] || !allNodesMap[target]) {
          return edges;
        }
        return edges.concat({
          source: source,
          target: target,
          type: 'entity-reference'
        });
      }, []);


    this.graph = {
      "nodes": hashMap(allNodesMap),
      "edges": edges
    }
  },

  attachEventListeners() {
    $('[typeof="fise:TextAnnotation"]').on('mouseenter', e => this.highlightEntities(e));
    $('[typeof="fise:TextAnnotation"]').on('mouseleave', () => this.removeAnnotationHighlights());
  },

  highlightEntities(e) {
    const getSubject = this.rdf.getSubject.bind(this.rdf);
    const expandCurie = this.rdf.expand.bind(this.rdf);

    const textAnnotationId = $(e.target).closest('[typeof="fise:TextAnnotation"]').attr('resource');
    const textAnnotation = this.rdf.getSubject(textAnnotationId);

    const parentEntities = this.rdf.getSubjects('dcterms:relation', baseURI + textAnnotationId)
      .map(getSubject)
      .filter(subject => subject.types.indexOf(expandCurie('fise:EntityAnnotation')) > -1);

    const textAnnotationsOfSameType = parentEntities
      .map(this.getObjectsByCurie('fise:entity-type'))
      .reduce(...flatMap)
      .map(type => this.rdf.getSubjects('fise:entity-type', type))
      .reduce(...flatMap)
      .map(getSubject)
      .map(this.getObjectsByCurie('dcterms:relation'))
      .reduce(...flatMap)
      .map(url => url.replace(baseURI, ''));

    const textAnnotationsOfSameEntity = parentEntities
      .map(this.getObjectsByCurie('dcterms:relation'))
      .reduce(...flatMap)
      .map(url => url.replace(baseURI, ''));

    this.highlightTypeAnnotations(textAnnotationsOfSameType);
    this.highlightEntityAnnotations(textAnnotationsOfSameEntity);

    const types = parentEntities
      .map(subject => [...this.getObjectsByCurie('fise:entity-type', subject), ...this.getObjectsByCurie('dc:type', subject)]) // does querying for dc:type work?
      .reduce(...flatMap)
      .map(curieOrURL => this.rdf.shorten(curieOrURL) || curieOrURL)
      .reduce(...unique);

    const labels = parentEntities
      .map(this.getObjectsByCurie('fise:entity-label'))
      .reduce(...flatMap)
      .reduce(...unique);

    console.log('type:', types.join(' - '));
    console.log('label:', labels.join(' - '));
    console.log('\n');
  },

  removeAnnotationHighlights() {
    $(`[resource]`).removeClass('highlight-type highlight-entity');
  },

  highlightTypeAnnotations(textAnnotations) {
    textAnnotations.forEach(annotation => $(`[resource="${annotation}"]`).addClass('highlight-type'));
  },

  highlightEntityAnnotations(textAnnotations) {
    textAnnotations.forEach(annotation => $(`[resource="${annotation}"]`).addClass('highlight-entity'));
  },

  makeD3Graph(graph) {
    const {width, height} = this.getGraphSize();
    const color = d3.scale.category20();
    const domGraph = d3.select('#graph')
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    this.force = d3.layout.force()
      .charge(-120)
      .linkDistance(30)
      .size([width, height]);

    const nodeById = d3.map();

    graph.nodes.forEach(node => {
      nodeById.set(node.id, node);
    });

    graph.edges.forEach(edge => {
      edge.source = nodeById.get(edge.source);
      edge.target = nodeById.get(edge.target);
    });

    this.force
      .nodes(graph.nodes)
      .links(graph.edges)
      .start();

    this.link = domGraph.selectAll(".link")
        .data(graph.edges)
      .enter().append("line")
        .attr("class", "link")
        .style("stroke-width", (d) => Math.sqrt(d.value));

    this.node = domGraph.selectAll(".node")
        .data(graph.nodes)
      .enter().append("circle")
        .attr("class", "node")
        .attr("r", 5)
        .style("fill", (d) => color(d.group))
        .call(this.force.drag);

    this.force.on('tick', () => {
      this.link.attr("x1", (d) => d.source.x)
          .attr("y1", (d) => d.source.y)
          .attr("x2", (d) => d.target.x)
          .attr("y2", (d) => d.target.y);

      this.node.attr("cx", (d) => d.x)
          .attr("cy", (d) => d.y);
    });
  },

  getGraphSize() {
    return {
      width: window.innerWidth - (MARGIN * 2),
      height: (window.innerHeight / 2) - (MARGIN * 2)
    }
  }
};


window.addEventListener("load", () => {
  app.init();

  Object.assign(window, app, {d3});
});
