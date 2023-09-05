## begin license ##
#
# All rights reserved.
#
# Copyright (C) 2022 Seecr (Seek You Too B.V.) https://seecr.nl
#
## end license ##


""" Tools for working with Plain Old Data (POD) in Python.

    1. POD is an *in memory* data representation based on dict and tuple/list, as such, it
       is directly manipulable from Python.
    2. It is compatible with straight forward deserialization of JSON-LD in *expanded* form.
       (JSON-LD is a *serialization format* which is not manipulable unless parsed into POD.)
    3. POD is structured like JSON-LD expanded form:
       - dicts contain str keys and tuple values
       - tuples contain dicts
       - exceptions are allowed:
           - a dict value can also be a str (needed for JSON-LD @id and @type)
           - a tuple value can also be a str (needed for JSON-LD @type)
           - theres is not explicit support, it just is flexible and not demanding.
    4. PODs are dicts and have no own __dict__, for efficiency reasons
    5. Tuples (not lists) are used because of the huge optimizations in Python

"""

from functools import cache
import autotest
test = autotest.get_tester(__name__)
#from metastreams.jsonld import tuple2list


@cache
def compile_podpath(p):
    return compile('obj' + p, repr(p), 'eval')


def getp(o, podpath):
    """ simple get for nested dicts/lists using compiled expression for efficiency """
    return eval(
        compile_podpath(podpath),
        {'obj': o})


@test
def pod_path():
    o = {'http:/a b.nl/': ({'urn:uuid:001': ("aap",)},)}
    p = "['http:/a b.nl/'][0]['urn:uuid:001'][0]"
    test.eq("aap", getp(o, p))


def gets(pod, *keys, default=None):
    """ get a value from a pod, using alternating dict keys/tuple indices """
    for k in keys:
        try:
            pod = pod[k]
        except (KeyError, IndexError):
            return default
    return pod


@test
def pod_gets():
    test.eq({1: 42}, gets({1: 42}))
    test.eq(42, gets({1: 42}, 1))
    test.eq(42, gets({1: (42,)}, 1, 0))
    test.eq(None, gets({1: (42,)}, 2, 0))
    test.eq(None, gets({1: (42,)}, 1, 1))
    test.eq('default', gets({1: (42,)}, 1, 1, default='default'))


def puts(pod, *keys, v):
    """ put a value in a pod structure with alternating dict/tuple,
        keys is a sequence of alternating dict/tuple keys,
        it overwrites existing values, dicts are modified, tuples replaced
        and lists become tuples.
    """
    if keys:
        k, *ks = keys
        if isinstance(pod, dict):
            tpl = pod.setdefault(k, ())
            dict.__setitem__(pod, k, puts(tpl, *ks, v=v))
            return pod
        else:
            try: dct = pod[k]             # get(k, default) idiom for tuple
            except IndexError: dct = {}
            return tuple(pod[:k]) + (puts(dct, *ks, v=v),) + tuple(pod[k+1:])
    else:
        return v


@test
def pod_puts():
    test.eq(42, puts((), v=42))
    test.eq(42, puts({}, v=42))
    test.eq((42,), puts((), 0, v=42))
    test.eq((42,), puts((41,), 0, v=42))
    test.eq((41, 42,), puts((41,), 1, v=42))
    test.eq((41, 42,), puts((41, 43), 1, v=42))
    test.eq((42, 43,), puts((41, 43), 0, v=42))
    test.eq((41, 43, 42), puts((41, 43), 2, v=42))
    test.eq((42,), puts((), 0, v=42))
    test.eq(({2: 42},), puts((), 0, 2, v=42))
    test.eq(({2: (42,)},), puts((), 0, 2, 0, v=42))
    test.eq(({2: ({3: 42},)},), puts((), 0, 2, 0, 3, v=42))
    test.eq({1: 42}, puts({}, 1, v=42))
    test.eq({1: (42,)}, puts({}, 1, 0, v=42))
    test.eq({1: ({2: (42,)},)}, puts({}, 1, 0, 2, 0, v=42))
    test.eq((42,), puts((), 9, v=42)) # too large index means append
    test.eq(({1: 42},), puts((), 1, 1, v=42)) # idem
    d = {1: ({2: ({3: (4,)},)},)}
    test.eq(4, gets(d, 1, 0, 2, 0, 3, 0))
    puts(d, 1, 0, 2, 0, 3, 1, v=5)
    test.eq({1: ({2: ({3: (4, 5)},)},)}, d)
    test.eq(42, puts([], v=42))
    test.eq((42,), puts([], 0, v=42))
    test.eq((42,), puts([41,], 0, v=42))


class PodMeta(type):
    """ This ensures that every subclass has __slots__ and hence no __dict__ """
    def __new__(cls, name, bases, dic):
        assert '__slots__' in dic, f"Subclass {name!r} must have '__slots__'"
        assert all(hasattr(base, '__slots__') for base in bases if base is not dict), f"All bases must have '__slots__'"
        return super().__new__(cls, name, bases, dic)


class Pod(dict, metaclass=PodMeta):
    __slots__ = ()

    def __reduce_ex__(self, version):
        """ called by pickle.dump; pickles Pod as a plain dict """
        return dict, (), None, None, iter(self.reduce_kv())

    def reduce_kv(self):
        """ determines the key-value pairs to be pickled """
        return self.items()

    @classmethod
    def frompickle(clz, p):
        return clz(**p)

    #def __deepcopy__(self, memo):
    #    """ make a deep copy, replacing tuple by list; for PyLD expand() """
    #    return tuple2list(self)

    def __getitem__(self, i):
        """ only here to get rid of confusing error messages for pod[:1] etc """
        if isinstance(i, slice):
            raise TypeError(f"Slicing Pod is not supported: {i!r}")
        return dict.__getitem__(self, i)

    def __setitem__(self, k, v):
        raise NotImplementedError("arbitrary keys are not pickled; use .puts() or add a @propery and extend reduce_kv/frompickle")

    gets = gets
    puts = puts


@test
def pickling_as_dict():
    import pickle
    o0 = Pod({1:2})
    s = pickle.dumps(o0)
    o1 = pickle.loads(s)
    test.eq(o0, o1)
    test.eq(dict, type(o1))
    test.eq(o0[1], o1[1])


@test
def better_error_slice():
    p = Pod()
    with test.raises(TypeError, "Slicing Pod is not supported: slice(None, 72, None)"):
        p[:72]


@test
def check_subclasses_have_no_dict():
    with test.raises(AssertionError, "Subclass 'D' must have '__slots__'"):
        class D(Pod):
            pass
    class D(Pod):
        __slots__ = ()
    with test.raises(AssertionError, "Subclass 'E' must have '__slots__'"):
        class E(D):
            pass
    class F:
        pass
    with test.raises(AssertionError, "All bases must have '__slots__'"):
        class G(Pod, F):
            __slots__ = ()
    class F1:
        __slots__ = ()
    class G(Pod, F1):
        __slots__ = ()


@test
def pickle_and_unpickle():
    class X(Pod):
        __slots__ = ()
    x = X()
    x.puts('aap', v=42)
    import pickle
    q = pickle.dumps(x)
    y = pickle.loads(q)
    test.eq({'aap': 42}, y)
    x2 = X.frompickle(y)
    test.eq({'aap': 42}, x2)
    test.isinstance(x2, X)

