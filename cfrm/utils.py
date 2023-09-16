from autotest import get_tester
test = get_tester(__name__)

from .uuid7 import UUID7
from rdflib import URIRef



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


