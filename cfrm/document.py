from autotest import get_tester
test = get_tester(__name__)

from rdflib import Graph, URIRef, Literal
from rdflib.plugins.serializers.jsonld import from_rdf

import json
import operator
import itertools

from .utils import fix_urirefs


def materialize(*ops):
    publish, retract = [], set()
    for op in ops:
        if op.get('operation') == 'retract':
            retract.add(op['base'])
        else:
            publish.append(op)
    graph = Graph()
    for op in (op for op in publish if op['@id'] not in retract):
        v = op['object']
        graph.add((
            URIRef(op['subject']),
            URIRef(op['predicate']),
            URIRef(v['@id']) if isinstance(v, dict) else Literal(v)))

    result = from_rdf(graph, use_native_types=True)
    fix_urirefs(result)
    result.sort(key=operator.itemgetter('@id'))
    return result


@test
def test_from_file():
    """ We do this from data, so we can use the same tests in JavaScript etc """
    j = json.load(open('./cfrm/static/testdata.json'))
    test.isinstance(j, list)
    for case in j:
        operations = case['operations']
        result = case['result']
        permutations = list(itertools.permutations(operations))
        print(f" > {case['case']}, {len(operations)} ops, {len(permutations)} permutations")
        for p in permutations:
            d = materialize(*p)
            test.eq(result, d)

