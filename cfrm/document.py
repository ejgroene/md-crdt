from autotest import get_tester
test = get_tester(__name__)

from rdflib import Graph, URIRef, Literal
from rdflib.plugins.serializers.jsonld import from_rdf

import json
import operator
import itertools

from .operations import Publish, Retract
from .uuid7 import UUID7

import cfrm.pod as pod


def fix_urirefs(subjects, idx=None):
    """ All URIRef objects *are* str, but for comparisons, it does not work, so replace them """
    idx = idx or {}
    for subject in subjects:
        if '@id' in subject and len(subject) > 1:
            idx[subject['@id']] = subject
    for i, subject in enumerate(subjects):
        if len(subject) == 1 and subject.get('@id') in idx:
            # replace {'@id': <uri>} with the object <uri> points to
            subjects[i] = idx[subject['@id']]
        for predicate, objects in subject.items():
            if isinstance(objects, list):
                fix_urirefs(objects, idx=idx)
            elif isinstance(objects, URIRef):
                # make it only a str
                subject[predicate] = str(objects)


class Document(pod.List):
    __slots__ = ['_roots', '_index', '_child', '_quads', '_graph']

    def __init__(self):
        self._roots = [] # document roots (no base)
        self._index = {} # maps id to operation; quick/clean lookup
        self._child = {} # maps id to ids of children; forms tree
        self._quads = {} # all triples part of the end result
        self._graph = Graph() # helper for creating json-ld

    def add_op(self, op):
        " Just add an operation to the set."
        self._index[op.id] = op
        if 'base' in op:
            self._child.setdefault(op.base, []).append(op.id)
        else:
            self._roots.append(op.id)

    def walk_ops(self, ops=None):
        " Recursively visit all operations in the tree "
        op_ids = self._roots if ops is None else ops
        for op_id in op_ids:
            yield self._index[op_id]
            yield from self.walk_ops(self._child.get(op_id, ()))
        
    def publish(self, op):
        " Admit a triple to the result."
        s = URIRef(op.subject)
        p = URIRef(op.predicate)
        v = op.object
        o = URIRef(v['@id']) if isinstance(v, dict) else Literal(v)
        self._quads[str(op.id)] = s, p, o, self._graph

    def retract(self, op):
        " Remove one triple from the end result."
        if str(op.base) not in self._quads:
            "visting is order, so already retracted"
            return
        del self._quads[str(op.base)]

    def apply_all(self, *ops):
        " Add more operations. Regenerate result."
        self._graph.remove((None, None, None))
        for op in ops:
            self.add_op(op)
        for op in self.walk_ops():
            op.apply(self)
        self.to_jsonld()

    def to_jsonld(self):
        " Helper for making JSON-LD."
        self._graph.addN(q for q in self._quads.values())
        self[:] = from_rdf(self._graph, use_native_types=True)
        fix_urirefs(self)
        self.sort(key=operator.itemgetter('@id'))
        


@test
def object_with_properties():
    o = Document()
    o.apply_all(Publish(subject='root0', predicate='A', object=42))
    test.isinstance(o[0]['@id'], str)
    test.eq([{'@id': 'root0', 'A': [{'@value': 42}]}], o)
    o.apply_all(Publish(subject='root0', predicate='B', object='smoo'))
    test.eq([{'@id': 'root0', 'A': [{'@value': 42}], 'B': [{'@value': 'smoo'}]}], o)
    o.apply_all(Publish(subject='root0', predicate='A', object='fortytwo'))
    test.eq([{'@id': 'root0', 'A': [{'@value': 42}, {'@value': "fortytwo"}], 'B': [{'@value': 'smoo'}]}], o)


@test
def object_with_hierarchy():
    o = Document()
    o1 = Publish(subject='root0', predicate='S', object={'@id': 'sub0'})
    o2 = Publish(subject='sub0', predicate='Z', object={'@id': 'sub1'})
    o.apply_all(o1, o2)
    sub0 = {'@id': 'sub0', 'Z': [{'@id': 'sub1'}]}
    test.eq([{'@id': 'root0', 'S': [sub0]}, sub0], o, diff=test.diff2)
    o3 = Publish(subject='sub1', predicate='B', object=42)
    o.apply_all(o3)
    sub1 = {'@id': 'sub1', 'B': [{'@value': 42}]}
    sub0 = {'@id': 'sub0', 'Z': [sub1]}
    test.eq({'@id': 'root0', 'S': [{'@id': 'sub0', 'Z': [sub1]}]}, o[0], diff=test.diff2)
    test.eq(sub0, o[1], diff=test.diff2)
    test.eq(sub1, o[2], diff=test.diff2)


@test
def retract_statement():
    o = Document()
    pub0 = Publish(subject='root0', predicate='A', object=42)
    pub1 = Publish(subject='root0', predicate='A', object='hi')
    o.apply_all(pub0, pub1)
    test.eq([{'@id': 'root0', 'A': [{'@value': 42}, {'@value': 'hi'}]}], o)
    o.apply_all(Retract(base=pub0.id))
    test.eq([{'@id': 'root0', 'A': [{'@value': 'hi'}]}], o)
    o.apply_all(Retract(base=pub1.id))
    test.eq({}, o._quads)
    test.eq([], o)


@test
def concurrent_replace():
    o = Document()
    pub0 = Publish(subject='root0', predicate='A', object=42)
    ret0 = Retract(base=pub0.id)
    pub1 = Publish(subject='root0', predicate='A', object=43)
    ret1 = Retract(base=pub0.id)
    pub2 = Publish(subject='root0', predicate='A', object=44) # latest timestamp wins
    o.apply_all(pub0, ret0, ret1, pub1, pub2)
    test.eq([{'@id': 'root0', 'A': [{'@value': 43}, {'@value': 44}]}], o)


def as_operations(obj, base_op=None):
    """ Flattens a piece of JSON(-LD) to operations """
    id = obj.get('id', UUID7())
    if not base_op:
        base_op = {'id': id}
    if obj.get('operation') == 'retract':
        base_op['operation'] = 'retract'
    op = base_op | {'subject': obj['@id']}
    for predicate, object in obj.items():
        if predicate != '@id':
            op |= {'predicate': predicate}
            if isinstance(object, dict):
                yield op | {'object': {'@id': object['@id']}}
                yield from as_operations(object, base_op)
            else:
                yield op | {'object': object}
        
        
@test
def make_operation():
    raw = {
        '@id': "john0",
        'address': "Fishstreet 9",
    }
    ops = as_operations(raw)
    test.eq([{
        'id': test.any,
        'subject': "john0",
        'predicate': "address",
        'object': "Fishstreet 9",
    }], list(ops), diff=test.diff2)


@test
def make_some_operations():
    raw = {
        '@id': "john0",
        'address': {
            '@id': "fishstreet9",
            'street': "Fishstreet",
            'number': 9
    }}
    ops = list(as_operations(raw))
    id = ops[0]['id']
    group0 = [{
        'id': id,
        'subject': "john0",
        'predicate': "address",
        'object': {'@id': "fishstreet9"},
        },{
        'id': id,
        'subject': "fishstreet9",
        'predicate': "street",
        'object': "Fishstreet"
        },{
        'id': id,
        'subject': "fishstreet9",
        'predicate': "number",
        'object': 9
    }]
    test.eq(group0, ops, diff=test.diff2)


@test
def publish_bunch():
    id = UUID7()
    raw = {
        'id': id,
        '@id': "john0",
        'address': {
            '@id': "fishstreet9",
            'street': "Fishstreet",
            'number': 9
    }}
    ops = list(as_operations(raw))
    test.eq(4, len(ops))
    test.truth(all(o['id'] == id for o in ops))


@test
def retract_bunch():
    id0 = UUID7()
    raw = {
        'operation': 'retract',
        'id': id0,
        '@id': "john0",
        'address': {
            '@id': "fishstreet9",
            'street': "Fishstreet",
            'number': 9
    }}
    ops = list(as_operations(raw))
    test.eq(5, len(ops))
    test.truth(all(o['operation'] == 'retract' for o in ops))
    test.truth(all(o['id'] == id0 for o in ops))


@test
def concurrent_edit():
    # A publishes this
    p0 = Publish(subject='a', predicate='b', object='c')
    # B corrects this
    r0 = Retract(base=p0.id)
    p1 = Publish(subject='a', predicate='b', object='d', base=r0.id)
    # A does not agree...
    r1 = Retract(base=p1.id)
    p2 = Publish(subject='a', predicate='b', object='c', base=r1.id)

    # we get this in order
    d = Document()
    d.apply_all(p0, r0, p1, r1, p2)
    test.eq([{'@id': 'a', 'b': [{'@value': 'c'}]}], d)
   
    # we do not get this in order
    for p in itertools.permutations([p0, r0, p1, r1, p2]):
        d = Document()
        d.apply_all(*p)
        test.eq([{'@id': 'a', 'b': [{'@value': 'c'}]}], d)
    
