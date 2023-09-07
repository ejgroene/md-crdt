from autotest import get_tester
test = get_tester(__name__)

import uuid
import datetime


class Operation:

    __slots__ = ['id', 'timestamp', 'base']

    def __init__(self, id, base):
        self.timestamp = datetime.datetime.now()
        self.base = base
        self.id = id or uuid.uuid1()


class Insert(Operation):

    __slots__ = ['key', 'value']

    def __init__(self, id, base, key, value):
        super().__init__(id, base)
        self.key = key
        self.value = value

    def apply(self, obj):
        if node := obj.get_node(self):
            pass
        else:
            node = obj.create_root(self.id)
        obj.add_edge(node, self.key, self.value)


class Delete(Operation):
    def apply(self, obj):
        pass


class Object(list):

    __slots__ = ['_index']

    def __init__(self):
        self._index = {}

    def get_node(self, op):
        return self._index.get(op.id)

    def create_root(self, id):
        node = {'@id': id}
        self.append(node)
        self._index[node['@id']] = node
        return node

    def add_edge(self, node, key, value):
        node.setdefault(key, []).append(value)
        if isinstance(value, dict) and '@id' in value:
            self._index[value['@id']] = value
        
    def apply_all(self, *ops):
        for op in ops:
            op.apply(self)


@test
def create_object():
    o = Object()
    o.apply_all(Insert(base=None, id='root0', key='A', value=42))
    test.eq([{'@id': 'root0', 'A': [42]}], o)
    o.apply_all(Insert(base=None, id='root0', key='B', value='smoo'))
    test.eq([{'@id': 'root0', 'A': [42], 'B': ['smoo']}], o)
    o.apply_all(Insert(base=None, id='root0', key='A', value='fortytwo'))
    test.eq([{'@id': 'root0', 'A': [42, 'fortytwo'], 'B': ['smoo']}], o)

@test
def create_sub_nodes():
    o = Object()
    o1 = Insert(base=None, id='root0', key='S', value={'@id': 'sub0'})
    o2 = Insert(base=o1, id='sub0', key='Z', value={'@id': 'sub1'})
    o.apply_all(o1, o2)
    test.eq([{'@id': 'root0', 'S': [{'@id': 'sub0', 'Z': [{'@id': 'sub1'}]}]}], o, diff=test.diff2)
    o3 = Insert(base=o1, id='sub1', key='B', value=42)
    o.apply_all(o3)
    test.eq([{'@id': 'root0', 'S': [{'@id': 'sub0', 'Z': [{'@id': 'sub1', 'B': [42]}]}]}], o, diff=test.diff2)

@test
def concurrent_edit():
    """ These actually do not exists... every triple is unique. What is possible though is 
        a triple being deleted concurrently """

@test
def delete_value():
    o = Object()
    o.apply_all(Insert(base=None, id='root0', key='A', value=42))
    test.eq([{'@id': 'root0', 'A': [42]}], o)
    o.apply_all(Delete(id='del0', base='root0'))



