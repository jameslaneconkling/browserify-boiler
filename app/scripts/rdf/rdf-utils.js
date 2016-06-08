"use strict";
const _ = require('lodash');

export const makeNode = (jsonGraph, id, label) => {
  jsonGraph.graph.nodes.push({id, label});
  return jsonGraph;
};

export const makeEdge = (jsonGraph, source, target, label) => {
  jsonGraph.graph.edges.push({
    source, target, metadata: {label}
  });
  return jsonGraph;
};

export const rdfaSubjects2jsonGraph = (rdfaSubjects, jsonGraph) => {
  jsonGraph = jsonGraph || {
    graph: {
      "nodes": [],
      "edges": []
    }
  };

  return rdfaSubjects
    .reduce((jsonGraph, subjectNode) => {
      // create subject node
      makeNode(jsonGraph, subjectNode.subject);

      // create object nodes
      // TODO - could this create duplicate nodes?
      const predicateNodes = _.map(subjectNode.predicates);

      predicateNodes
        .reduce((flatArray, predicateNode) => {
          return flatArray.concat(predicateNode.objects);
        }, [])
        .forEach(objectNode => makeNode(jsonGraph, objectNode.type, objectNode.value));

      // create predicate edges
      predicateNodes.forEach(predicateNode => {
        predicateNode.objects.forEach(objectNode => makeEdge(jsonGraph, subjectNode.subject, objectNode.type, predicateNode.predicate));
      });

      return jsonGraph;
    }, jsonGraph);
};
