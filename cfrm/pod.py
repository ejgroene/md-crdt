from autotest import get_tester
test = get_tester(__name__)


class WithSlots(type):
    def __new__(cls, name, bases, dic):
        assert '__slots__' in dic, f"Pod subclass {name!r} must have '__slots__'"
        assert all(hasattr(b, '__slots__') for b in bases if b not in (list, dict)), f"All bases must have '__slots__'"
        return super().__new__(cls, name, bases, dic)


class Dict(dict, metaclass=WithSlots):
    __slots__ = ()
    __getattr__ = dict.__getitem__


class List(list, metaclass=WithSlots):
    __slots__ = ()


@test
def check_for_slots():
    """ As not to double the amount of dict's in Python, we enforce __slots__"""
    with test.raises(AssertionError, "Pod subclass 'NoSlots' must have '__slots__'"):
        class NoSlots(Dict):
            pass
    class Base:
        pass
    with test.raises(AssertionError, "All bases must have '__slots__'"):
        class NoSlotsOnBase(Base, List):
            __slots__ = None


@test
def pod_dict():
    p = Dict(a=42)
    test.isinstance(p, dict)
    test.eq(42, p.a)


@test
def pod_list():
    l = List([2,3])
    test.isinstance(l, list)
    test.eq(2, len(l))
    test.eq(2, l[0])
    test.eq(3, l[1])
    
