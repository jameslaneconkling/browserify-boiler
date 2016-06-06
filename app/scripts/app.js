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
const MARGIN = 30;

const getObjectsByCurie = (graph, curie, subject) => subject.getValues(graph.curieParser.parse(curie));
const getLabelsForEntityType = (rdf, entityType) => rdf.getSubjects("fise:entity-type", entityType)
  .map(rdf.getSubject.bind(rdf))
  .map(subject => getObjectsByCurie(rdf.graph, 'fise:entity-label', subject));


const app = {
  init() {
    this.buildGraph();
    this.attachEventListeners();
    // this.makeD3Graph(this.graph);
  },

  buildGraph() {
    this.rdf = document.data;

    this.getObjectsByCurie = _.curry(getObjectsByCurie)(this.rdf.graph);
    // const subjects = rdf.getSubjects()
    //   .map(subjectId => rdf.getSubject(subjectId).toObject());
    // this.graph = rdfaSubjects2jsonGraph(subjects).graph;
  },

  attachEventListeners() {
    $('[typeof="fise:TextAnnotation"]').on('mouseenter', e => this.highlightEntities(e));
    $('[typeof="fise:TextAnnotation"]').on('mouseleave', () => this.removeAnnotationHighlights());
  },

  highlightEntities(e) {
    const getSubject = this.rdf.getSubject.bind(this.rdf);
    const expandCurie = this.rdf.graph.curieParser.parse.bind(this.rdf.graph.curieParser);

    const textAnnotationId = $(e.target).closest('[typeof="fise:TextAnnotation"]').attr('resource');
    const textAnnotation = this.rdf.getSubject(textAnnotationId);

    const parentEntities = this.rdf.getSubjects('dcterms:relation', baseURI + textAnnotationId)
      .map(getSubject)
      .filter(subject => subject.types.indexOf(expandCurie('fise:EntityAnnotation')) > -1);

    const textAnnotationsOfSameType = parentEntities
      .map(this.getObjectsByCurie('fise:entity-type'))
      .reduce(...flatMap)
      .map(type => this.rdf.getSubjects(expandCurie('fise:entity-type'), type))
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
