import { type Term, type Store, DataFactory, type NamedNode, type Literal } from "n3";

export class Subject {
  graph: Term;
  constructor(public store: Store, public node: Term, graph?: Term) {
    this.graph = graph ?? DataFactory.defaultGraph();
  }

  get(prop: NamedNode, order?: Map<string, number>): Subject[] {
    const objects = this.store.getObjects(this.node, prop, this.graph).map(obj => new Subject(this.store, obj, this.graph));
    if (order) {
      objects.sort((a, b) => {
        return (order.get(a.node.id)!) - (order.get(b.node.id)!);
      })
    }
    return objects;
  }
}

export function nodeUrl(node: NamedNode) {
  return node.id;
}

export function nodeUrls(subjects: Subject[]) {
  return subjects.flatMap(s => isNamedNode(s.node) ? s.node.id : []);
}

/// Returns the value of an RDF literal
export function nodeValue(node: Literal) {
  return node.value;
}

/// If |subj| represents an RDF literal node, returns its value. Otherwise undefined.
export function nodeValueOrUndefined(subj?: Subject) {
  return subj && isLiteral(subj.node) ? subj.node.value : undefined;
}

export function nodeValues(subjects: Subject[]) {
  return subjects.flatMap(s => isLiteral(s.node) ? s.node.value : []);
}

export function isNamedNode(node: Term): node is NamedNode {
  return node.termType === "NamedNode";
}
export function isLiteral(node: Term): node is Literal {
  return node.termType === "Literal";
}

export function allOfType(store: Store, type: Term, graph?: Term) {
  return store.getQuads(null, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', type, graph ?? null).map(
    ({ subject, graph }) => new Subject(store, subject, graph)
  );
}

export function Prefix(base: string) {
  new URL(base);
  function result(rest: string): NamedNode {
    const result = base + rest;
    new URL(result);
    return DataFactory.namedNode(result);
  }
  result.base = base;
  return result;
}

export function rewriteSchema(term: Term) {
  if (term.termType === "NamedNode") {
    return DataFactory.namedNode(term.value.replace('http://schema.org/', 'https://schema.org/'));
  }
  return term;
}
