from autotest import get_tester
test = get_tester(__name__)

from rdflib import Graph, URIRef, Literal
from rdflib.plugins.serializers.jsonld import from_rdf

import json
import operator

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
        if isinstance(subject, dict) and '@id' in subject and len(subject) == 1 and subject['@id'] in idx:
            subjects[i] = idx[subject['@id']]
        for predicate, objects in subject.items():
            if isinstance(objects, list):
                fix_urirefs(objects, idx=idx)
            elif isinstance(objects, URIRef):
                subject[predicate] = str(objects)


class Document(pod.List):
    __slots__ = ['_graph', '_operations']

    def __init__(self):
        self._graph = Graph()
        self._operations = {}

    def publish(self, op):
        s = URIRef(op.subject)
        p = URIRef(op.predicate)
        v = op.object
        o = URIRef(v['@id']) if isinstance(v, dict) else Literal(v)
        self._operations[str(op.id)] = s, p, o, self._graph

    def retract(self, op):
        if str(op.base) not in self._operations:
            return
        del self._operations[str(op.base)]

    def apply_all(self, *ops):
        self.clear()
        self._graph.remove((None, None, None))
        for op in ops:
            op.apply(self)
        self._graph.addN(q for q in self._operations.values())
        self.extend(from_rdf(self._graph, use_native_types=True))
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
    test.eq({}, o._operations)
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
    """ These actually do not exists... every triple is unique. What is possible though is 
        a triple being retracted concurrently, but what exactly is the conflict then???
        In fact, the only real concurrent edit that could lead to a conflict is when
        a triple is retracted, republish, retracted, and so on. As multiple parties could both retracted
        the same triple, and multiple parties could also republish it, the question is: what is
        the last known state? Retracted or not? We need to know to what triple a retract operates on.
        Let's see.

            A           B           C           D
        pub(i0, b=0, a,b,c)  ret(d0, b=i0)  ret(d1, b=i1)  pub(i1, b=d1, a,b,c)

        These are all concurrent. What if we get the in this order: A B D C?
        How can we know C should have operated on A and not on D. So the end result is (a,b,c).

        A retract should explicitly point to a 'base'. For practical purposes we could use:
        1. add the timestamp to the triple (full reification, by all properties)
           (the timestamp actually contains very few useful bits of information)
        2. given every triple its own id (full reification, by seperate identifier)
           We could use UUID1 for this, which contains a timestamp as well.
           Or the new UUID 5 or 6?
     """
   


