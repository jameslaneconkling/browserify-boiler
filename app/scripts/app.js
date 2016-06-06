"use strict";
// const rdf = require('rdf-ext');
// const rdfaParser = require('rdf-parser-rdfa');
// const RDFaProcessor = require('green-turtle');
  // resolves to '/node_modules/green-turtle/build/RDFa.js' ?
import {rdfaSubjects2jsonGraph}  from './rdf/rdf-utils';
const d3 = require('d3');
const $ = require('jquery');
const log = console.log.bind(console);
const flatMap = [(flatMap, entityType) => flatMap.concat(entityType), []];

const baseURI = 'http://localhost:8080/api/v2/doc/www.npr.org/sections/itsallpolitics/2015/08/20/433253554/iran-lobbying-battle-heats-up-on-the-airwaves/';
const getTextAnnotation = ($child) => $child.closest('[typeof="fise:TextAnnotation"]');

const getObjectsByCurie = (graph, curie, subject) => subject.getValues(graph.curieParser.parse(curie));
const getSelectedText = (subject) => subject.predicates['http://fise.iks-project.eu/ontology/selected-text'].objects.map(object => object.value);
const getType = (subject) => subject.predicates['http://www.w3.org/1999/02/22-rdf-syntax-ns#type'].objects.map(object => object.value);
const getLabel = (subject) => subject.predicates['http://fise.iks-project.eu/ontology/entity-label'].objects.map(object => object.value);
const getEntityType = (subject) => subject.predicates['http://fise.iks-project.eu/ontology/entity-type'] ?
                                   subject.predicates['http://fise.iks-project.eu/ontology/entity-type'].objects.map(object => object.value) :
                                   [];
const getRelations = (subject) => subject.predicates['http://purl.org/dc/terms/relation'] ?
                                  subject.predicates['http://purl.org/dc/terms/relation'].objects.map(object => object.value) :
                                  [];

const getLabelsForEntityTypes = (rdf, entityType) => rdf.getSubjects("fise:entity-type", entityType)
  .map(rdf.getSubject.bind(rdf))
  .map(subject => getObjectsByCurie(rdf.graph, 'fise:entity-label', subject));

const MARGIN = 30;

const app = {
  init() {
    this.buildGraph();
    this.attachEventListeners();
    // this.makeD3Graph(this.graph);
  },

  buildGraph() {
    const rdf = document.data;
    this.rdf = rdf;
    this.getLabelsForEntityTypes = getLabelsForEntityTypes;

    this.getObjectsByCurie = _.curry(getObjectsByCurie)(rdf);
    // const subjects = rdf.getSubjects()
    //   .map(subjectId => rdf.getSubject(subjectId).toObject());
    // this.graph = rdfaSubjects2jsonGraph(subjects).graph;
  },

  attachEventListeners() {
    $('[typeof="fise:TextAnnotation"]').on('mouseenter', e => this.textAnnotationEntered(e));
    $('[typeof="fise:TextAnnotation"]').on('mouseleave', () => this.removeAnnotationHighlights());
  },

  textAnnotationEntered(e) {
    const textAnnotationId = getTextAnnotation($(e.target)).attr('resource');
    const textAnnotation = this.rdf.getSubject(textAnnotationId);
    // const selectedText = getSelectedText(textAnnotation)[0];

    const parentEntities = this.rdf.getSubjects('dcterms:relation', baseURI + textAnnotationId)
      .map(parentSubjectId => this.rdf.getSubject(parentSubjectId))
      .filter(parentSubject => getType(parentSubject).indexOf('http://fise.iks-project.eu/ontology/EntityAnnotation') > -1);

    const entityTypes = parentEntities
      .map(getEntityType)
      .reduce(...flatMap);

    const textAnnotationsOfSameType = entityTypes
      .map(type => this.rdf.getSubjects('http://fise.iks-project.eu/ontology/entity-type', type))
      .reduce(...flatMap)
      .map(textAnnotationId => this.rdf.getSubject(textAnnotationId))
      .map(getRelations)
      .reduce(...flatMap)
      .map(url => url.replace(baseURI, ''));

    const textAnnotationsOfSameEntity = parentEntities
      .map(getRelations)
      .reduce(...flatMap)
      .map(url => url.replace(baseURI, ''));

    this.highlightTypeAnnotations(textAnnotationsOfSameType);
    this.highlightEntityAnnotations(textAnnotationsOfSameEntity);
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
        // .style("stroke-width", (d) => Math.sqrt(d.value));

    this.node = domGraph.selectAll(".node")
        .data(graph.nodes)
      .enter().append("circle")
        .attr("class", "node")
        .attr("r", 5)
        // .style("fill", (d) => color(d.group));

    log(this.force);
  },

  getGraphSize() {
    return {
      width: window.innerWidth - (MARGIN * 2),
      height: window.innerHeight - (MARGIN * 2)
    }
  }
};


window.addEventListener("load", () => {
  app.init();

  Object.assign(window, app, {d3});
});
