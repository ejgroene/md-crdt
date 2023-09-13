from autotest import get_tester
test = get_tester(__name__)

from .uuid7 import UUID7
import cfrm.pod as pod


class Operation(pod.Dict):
    """ Represents the publication of a single piece of data.
        It is a dict (Pod) for efficiency and compatibility.
    """
    __slots__ = ()

    def __init__(self, **props):
        self['id'] = UUID7()
        self.update(props)


@test
def operation_as_data():
    """ Represent an Operation as a plain dict """
    id0 = UUID7()
    o = Operation(base="base0")
    id1 = UUID7()
    test.eq('base0', o.base)
    test.gt(id1, o.id)
    test.eq({
        'base': 'base0',
        'id': test.any(lambda id: id0 < id < id1),
        }, o)


class Publish(Operation):
    """ Represent on statement/triple as an Publish operation """
    __slots__ = ()

    def apply(self, obj):
        obj.publish(self)


@test
def publish_as_data():
    """ Represent an Publish as a plain dict """
    o = Publish(subject="subject0", predicate="predicate0", object="object0", base="base0")
    test.eq('subject0', o.subject)
    test.eq('predicate0', o.predicate)
    test.eq('object0', o.object)
    test.eq('base0', o.base)
    test.eq({
        'subject': 'subject0',
        'predicate': 'predicate0',
        'object': 'object0',
        'base': 'base0',
        'id': test.any(lambda x: isinstance(x, UUID7)),
        }, o)


class Retract(Operation):
    __slots__ = ()

    def __init__(self, base):
        super().__init__(base=base, operation='retract')

    def apply(self, obj):
        obj.retract(self)


@test
def retract_as_data():
    """ Represent a Retract as a plain dict """
    o = Retract(base="base0")
    test.eq('base0', o['base'])
    test.eq('retract', o.operation)
    test.eq({
        'id': test.any(lambda x: isinstance(x, UUID7)),
        'operation': 'retract',
        'base': "base0"
        }, o)

