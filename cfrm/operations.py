from autotest import get_tester
test = get_tester(__name__)

import uuid
import datetime
import pod


isstamp = datetime.datetime.fromisoformat

def stamp():
    return datetime.datetime.now().isoformat()


class Operation(pod.Dict):
    """ Represents the publication of a single piece of data.
        It is a dict (Pod) for efficiency and compatibility.
    """
    __slots__ = ()

    def __init__(self, subject):
        self['timestamp'] = stamp() 
        self['subject'] = subject or uuid.uuid1()


@test
def operation_as_data():
    """ Represent an Operation as a plain dict """
    t0 = stamp()
    o = Operation("subject0")
    t1 = stamp()
    test.eq('subject0', o.subject)
    test.gt(t1, o.timestamp)
    test.eq({
        'subject': 'subject0',
        'timestamp': test.any(lambda t: t0 < t < t1),
        }, o)


class Insert(Operation):
    """ Represent on statement/triple as an Insert operation """
    __slots__ = ()

    def __init__(self, subject, predicate, object):
        super().__init__(subject)
        self['predicate'] = predicate
        self['object'] = object
        self['operation'] = self.__class__.__name__.lower()

    def apply(self, obj):
        if node := obj.get_node(self.subject):
            pass
        else:
            node = obj.add_root(self.subject)
        obj.add_edge(node, self.predicate, self.object)


@test
def insert_as_data():
    """ Represent an Insert as a plain dict """
    o = Insert("subject0", "predicate0", "object0")
    test.eq('subject0', o.subject)
    test.eq('predicate0', o.predicate)
    test.eq('object0', o.object)
    test.eq('insert', o.operation)
    test.eq({
        'subject': 'subject0',
        'predicate': 'predicate0',
        'object': 'object0',
        'timestamp': test.any(isstamp),
        'operation': 'insert',
        }, o)


class Delete(Insert):
    __slots__ = ()

    def apply(self, obj):
        node = obj.get_node(self.subject)
        if node is not None:
            try:
                objects = node[self.predicate]
            except KeyError:
                pass
            else:
                objects.remove(self.object)
                if objects == []:
                    del node[self.predicate]
            if obj and len(node) == 1 and '@id' in node:
                obj.remove(node)
                del obj._nodes[node['@id']] # move!


@test
def delete_as_data():
    """ Represent a Delete as a plain dict """
    o = Delete("subject0", "predicate0", "object0")
    test.eq('subject0', o.subject)
    test.eq('predicate0', o.predicate)
    test.eq('object0', o.object)
    test.eq('delete', o.operation)
    test.eq({
        'subject': 'subject0',
        'predicate': 'predicate0',
        'object': 'object0',
        'timestamp': test.any(isstamp),
        'operation': 'delete',
        }, o)


class Object(pod.List):
    __slots__ = ['_nodes']

    def __init__(self):
        self._nodes = {}

    def get_node(self, subject):
        return self._nodes.get(subject)

    def add_root(self, subject):
        node = {'@id': subject}
        self.append(node)
        self._nodes[subject] = node
        return node

    def add_edge(self, node, predicate, object):
        node.setdefault(predicate, []).append(object)
        if isinstance(object, dict) and '@id' in object:
            self._nodes[object['@id']] = object
        
    def apply_all(self, *ops):
        for op in ops:
            op.apply(self)


@test
def object_with_properties():
    o = Object()
    o.apply_all(Insert(subject='root0', predicate='A', object=42))
    test.eq([{'@id': 'root0', 'A': [42]}], o)
    o.apply_all(Insert(subject='root0', predicate='B', object='smoo'))
    test.eq([{'@id': 'root0', 'A': [42], 'B': ['smoo']}], o)
    o.apply_all(Insert(subject='root0', predicate='A', object='fortytwo'))
    test.eq([{'@id': 'root0', 'A': [42, 'fortytwo'], 'B': ['smoo']}], o)


@test
def object_with_hierarchy():
    o = Object()
    o1 = Insert(subject='root0', predicate='S', object={'@id': 'sub0'})
    o2 = Insert(subject='sub0', predicate='Z', object={'@id': 'sub1'})
    o.apply_all(o1, o2)
    test.eq([{'@id': 'root0', 'S': [{'@id': 'sub0', 'Z': [{'@id': 'sub1'}]}]}], o, diff=test.diff2)
    o3 = Insert(subject='sub1', predicate='B', object=42)
    o.apply_all(o3)
    test.eq([{'@id': 'root0', 'S': [{'@id': 'sub0', 'Z': [{'@id': 'sub1', 'B': [42]}]}]}], o, diff=test.diff2)


@test
def concurrent_edit():
    """ These actually do not exists... every triple is unique. What is possible though is 
        a triple being deleted concurrently, but what exactly is the conflict then???
        In fact, the only real concurrent edit that could lead to a conflict is when
        a triple is deleted, recreated, deleted, and so on. As multiple parties could both delete
        the same triple, and multiple parties could also recreate it, the question is: what is
        the last known state? Deleted or not? We need to know to what triple a delete is operates.
        Let's see.

            A           B           C           D
        ins(a,b,c)  del(a,b,c)  del(a,b,c)  ins(a,b,c)

        These are all concurrent. What if we get the in this order: A B D C?
        How can we know C should have operated on A and not on D. So the end result is (a,b,c).

        A delete should explicitly point to a 'base'. For practical purposes we could use:
        1. add the timestamp to the triple (full reification, by all properties)
           (the timestamp actually contains very few useful bits of information)
        2. given every triple its own id (full reification, by seperate identifier)
           We could use UUID1 for this, which contains a timestamp as well.
           Or the new UUID 5 or 6?

 """


@test
def delete_statement():
    o = Object()
    o.apply_all(Insert(subject='root0', predicate='A', object=42),
                Insert(subject='root0', predicate='A', object='hi'))
    test.eq([{'@id': 'root0', 'A': [42, 'hi']}], o)
    o.apply_all(Delete(subject='root0', predicate='A', object=42))
    test.eq([{'@id': 'root0', 'A': ['hi']}], o)
    o.apply_all(Delete(subject='root0', predicate='A', object='hi'))
    test.eq({}, o._nodes)
    test.eq([], o)


@test
def concurrent_replace():
    o = Object()
    insert0 = Insert(subject='root0', predicate='A', object=42)
    delete0 = Delete(subject='root0', predicate='A', object=42)
    insert1 = Insert(subject='root0', predicate='A', object=43)
    delete1 = Delete(subject='root0', predicate='A', object=42)
    insert2 = Insert(subject='root0', predicate='A', object=44) # latest timestamp wins
    o.apply_all(insert0, delete0, delete1, insert1, insert2)
    test.eq([{'@id': 'root0', 'A': [43, 44]}], o)


def as_operations(obj, base_op=None):
    """ Flattens a piece of JSON(-LD) to operations """
    timestamp = obj.get('timestamp', stamp())
    operation = obj.get('operation', 'insert')
    base_op = base_op or {'operation': operation, 'timestamp': timestamp}
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
        'operation': 'insert',
        'timestamp': test.any(isstamp),
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
    ts = ops[0]['timestamp']
    group0 = [{
        'operation': 'insert',
        'timestamp': ts,
        'subject': "john0",
        'predicate': "address",
        'object': {'@id': "fishstreet9"},
        },{
        'operation': 'insert',
        'timestamp': ts,
        'subject': "fishstreet9",
        'predicate': "street",
        'object': "Fishstreet"
        },{
        'operation': 'insert',
        'timestamp': ts,
        'subject': "fishstreet9",
        'predicate': "number",
        'object': 9
    }]
    test.eq(group0, ops, diff=test.diff2)


@test
def publish_bunch():
    stamp0 = stamp()
    raw = {
        'operation': 'insert',
        'timestamp': stamp0,
        '@id': "john0",
        'address': {
            '@id': "fishstreet9",
            'street': "Fishstreet",
            'number': 9
    }}
    ops = list(as_operations(raw))
    test.eq(5, len(ops))
    test.truth(all(o['operation'] == 'insert' for o in ops))
    test.truth(all(o['timestamp'] == stamp0 for o in ops))


@test
def delete_bunch():
    stamp0 = stamp()
    raw = {
        'operation': 'delete',
        'timestamp': stamp0,
        '@id': "john0",
        'address': {
            '@id': "fishstreet9",
            'street': "Fishstreet",
            'number': 9
    }}
    ops = list(as_operations(raw))
    test.eq(5, len(ops))
    test.truth(all(o['operation'] == 'delete' for o in ops))
    test.truth(all(o['timestamp'] == stamp0 for o in ops))

