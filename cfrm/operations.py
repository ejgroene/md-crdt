from autotest import get_tester
test = get_tester(__name__)

import uuid


class Operation(dict):

    @staticmethod
    def create(identifier):
        return Operation(type='create', identifier=identifier)

    @staticmethod
    def insert(base, predicate, value):
        return Operation(type='insert', base=base, predicate=predicate, value=value)

    def __init__(self, id=None, **kw):
        id = id or uuid.uuid1()
        super().__init__(id=id, **kw)


def materialize(*ops):
    "Create a mutable object from the given operations"
    ob = None
    for op in ops:
        if op['type'] == 'create':
            ob = {'identifier': op['identifier']}
        elif op['type'] == 'insert':
            ob[op['predicate']] = op['value']
        else:
            raise Exception
    return ob


op0 = Operation.create(identifier='id_0')
test.eq('create', op0['type'])
test.eq('id_0', op0['identifier'])
test.isinstance(op0['id'], uuid.UUID)

@test
def create_op():
    rep0 = materialize(op0)
    test.eq('id_0', rep0.pop('identifier'))
    test.comp.contains(rep0, 'id')
    test.eq({}, rep0)

op1 = Operation.insert(base=op0['id'], predicate='name', value='Whepagong')
test.eq('insert', op1['type'])
test.eq(op0['id'], op1['base'])
test.eq('name', op1['predicate'])
test.eq('Whepagong', op1['value'])


@test
def add_property():
    rep0 = materialize(op0, op1)
    test.eq('id_0', rep0.pop('identifier'))
    test.eq('Whepagong', rep0.pop('name'))
    test.eq({}, rep0)


@test
def insert_property():
    op2 = Operation.insert(base=op1['id'], predicate='town', value='Plywaid')
    rep0 = materialize(op0, op1, op2)
    test.eq({
       'identifier':
         'id_0',
       'name':
         'Whepagong',
       'town':
         'Plywaid',
        }, rep0, diff=test.diff2)

@test
def concurrent_edit():
    op1_1 = Operation.insert(base=op1['id'], predicate='name', value='Klozask')
    rep0 = materialize(op0, op1, op1_1)
    test.eq({}, rep0, diff=test.diff2)

